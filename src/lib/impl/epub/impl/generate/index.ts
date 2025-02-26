import { EPub, Chapter as EPubChapter } from "epub-gen-memory";
import type { IChapter } from "../../../../../types";
import type { IManga } from "../../../../../types/impl/database/impl/schema/manga";
import type { ImageFile } from "../../../../../types/impl/lib/impl/epub";
import { env } from "../../../../../env";
import { join } from "node:path";
import { exists } from "node:fs/promises";
import colors from "colors";
import { generateMetadataContent } from "./impl/metadata";
import { getMediaTitle, getSafeFileName, setupDirectory, downloadCoverImage, cleanupImageFiles } from "./impl/utils";
import { processChapter } from "./impl/chapters";

export const generateEpub = async (media: IManga, providerId: string, chapters: IChapter[]): Promise<string | null> => {
    if (chapters.length === 0) {
        if (env.DEBUG) {
            console.log(colors.red("No chapters found for ") + colors.blue(getMediaTitle(media)));
        }
        return null;
    }

    const content: EPubChapter[] = [];
    const imageFiles: ImageFile = {};

    const title = getMediaTitle(media);
    const safeTitle = getSafeFileName(title);

    const dir = join(import.meta.dir, `../manga/${providerId}/${safeTitle}`.slice(0, -1));
    const epubPath = join(dir, `${safeTitle}.epub`);

    if (await exists(epubPath)) return epubPath;

    if (env.DEBUG) {
        console.log(colors.green("Generating EPUB for ") + colors.blue(title) + colors.green("..."));
    }

    await setupDirectory(dir);
    await downloadCoverImage(media, dir);

    // Add metadata as first chapter
    content.push({
        title: title,
        author: media.author ?? "",
        content: generateMetadataContent({ ...media, coverPath: `${dir}/cover.jpg` }),
    });

    // Process chapters
    let imageId = 0;
    for (const chapter of chapters) {
        const processedChapter = await processChapter(chapter, providerId, dir, imageFiles, imageId, media);
        if (processedChapter) {
            content.push(processedChapter);
            imageId = processedChapter.imageId;
        }
    }

    // Add credits
    content.push({
        title: "Credits",
        content: `
            <p>Generated by <a href="https://anify.tv">Anify</a>.</p>
            <br />
            <p>Thanks for using Anify!</p>
        `,
    });

    const book = await generateBook(media, dir, content);
    await Bun.write(epubPath, book);
    await cleanupImageFiles(dir, imageFiles);

    return epubPath;
};

const generateBook = async (media: IManga, dir: string, content: EPubChapter[]): Promise<Buffer> => {
    return await new EPub(
        {
            title: getMediaTitle(media),
            cover: `file://${`${dir}/cover.jpg`}`,
            lang: "en",
            date: new Date(Date.now()).toDateString(),
            description: media.description ?? "",
            author: media.author ?? "",
            ignoreFailedDownloads: true,
        },
        content,
    ).genEpub();
};
