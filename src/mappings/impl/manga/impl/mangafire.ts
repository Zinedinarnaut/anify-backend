import { load } from "cheerio";
import MangaProvider from "..";
import { type IChapter, type IProviderResult, MediaFormat } from "../../../../types";
import type { IPage } from "../../../../types/impl/mappings/impl/manga";
import Jimp from "jimp";

export default class MangaFire extends MangaProvider {
    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;
    override id = "mangafire";
    override url = "https://mangafire.to";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override formats: MediaFormat[] = [MediaFormat.MANGA, MediaFormat.ONE_SHOT];

    override async search(query: string, format?: MediaFormat, year?: number): Promise<IProviderResult[] | undefined> {
        const results: IProviderResult[] = [];

        try {
            const data = await (await this.request(`${this.url}/filter?keyword=${encodeURIComponent(query)}${format ? `&type%5B%5D=${format.toLowerCase()}` : ""}${year && year != 0 ? `&year=%5B%5D=${year}` : ""}&sort=recently_updated`)).text();

            const $ = load(data);

            const requestPromises: Promise<void>[] = [];

            $("main div.container div.original div.unit").map((_, el) => {
                const id = $(el).find("a").attr("href") ?? "";

                requestPromises.push(
                    this.request(`${this.url}${id}`).then(async (response) => {
                        const secondReq = await response.text();
                        const $$ = load(secondReq);

                        const altTitles =
                            $$("main div#manga-page div.info h6")
                                ?.first()
                                ?.text()
                                ?.split("; ")
                                ?.map((s) => s.trim()) ?? [];
                        const year = $$("main div#manga-page div.meta").text()?.split("Published: ")[1]?.split(" to")[0]?.trim();

                        results.push({
                            id,
                            altTitles,
                            format: MediaFormat.UNKNOWN,
                            img: $(el).find("img").attr("src") ?? "",
                            title: $(el).find("div.info a").first()?.text()?.trim(),
                            year: year ? new Date(year).getFullYear() : 0,
                            providerId: this.id,
                        });
                    }),
                );
            });

            await Promise.all(requestPromises);

            return results;
        } catch {
            return undefined;
        }
    }

    override async fetchChapters(id: string): Promise<IChapter[] | undefined> {
        const chapters: IChapter[] = [];

        const pattern = /\.([^.]+)$/;
        const match = pattern.exec(id);

        const mangaId = match ? match[1] : "";

        const data = (await (
            await this.request(`${this.url}/ajax/manga/${mangaId}/chapter/en`, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    Referer: `${this.url}${id}`,
                },
            })
        ).json()) as { status: number; result: string; message: string; messages: string[] };

        if (data.status !== 200) {
            return chapters;
        }

        const $ = load(data.result);

        $("ul li.item").map((i, el) => {
            chapters.push({
                id: $(el).find("a").attr("href") ?? "",
                number: Number($(el).attr("data-number")),
                title: $(el).find("span").first()?.text()?.trim(), // Can also be $(el).find("a").attr("title")
                updatedAt: new Date($($(el).find("span")[1])?.text()).getTime(),
                rating: null,
            });
        });

        return chapters;
    }

    override async fetchPages(id: string): Promise<IPage[] | string | undefined> {
        const match = id.match(/\.([^.]+)$/);
        const mangaId = match?.[1]?.split("/")[0];

        const data = (await (
            await this.request(`${this.url}/ajax/read/${mangaId}/chapter/en`, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    Referer: `${this.url}${id}`,
                },
            })
        ).json()) as { status: number; result: { html: string }; message: string; messages: string[] };

        if (data.status !== 200) {
            // Sometimes it returns 404 with "Resource not found".
            return undefined;
        }

        const $ = load(data.result?.html);

        let chapterId = "";
        $("ul li").map((i, el) => {
            const chapId = $(el).find("a").attr("data-id");
            const url = $(el).find("a").attr("href");
            if (url === id) {
                chapterId = chapId ?? "";
            }
        });

        if (chapterId === "") {
            return [];
        }

        const imageData: IImageResponse = (await (
            await this.request(`${this.url}/ajax/read/chapter/${chapterId}`, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    Referer: `${this.url}${id}`,
                },
            })
        ).json()) as IImageResponse;

        const images = imageData.result.images.map((image, index) => {
            return {
                url: image[0],
                index: index,
                isScrambled: image[2] != 0,
                scrambledKey: image[2],
            };
        });

        const descrambledImages = await Promise.all(
            images.map(async (image) => {
                if (image.isScrambled) {
                    const descrambled = await this.descrambleImage(image.url, image.scrambledKey);
                    image.url = descrambled;
                }
                return {
                    url: image.url,
                    headers: {},
                    index: image.index,
                };
            }),
        );

        return descrambledImages;
    }

    private async descrambleImage(url: string, key: number): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const s = key;
            try {
                const image = await Jimp.read(url);

                const tileWidth = Math.min(200, Math.ceil(image.getWidth() / 5));
                const tileHeight = Math.min(200, Math.ceil(image.getHeight() / 5));
                const numTilesWide = Math.ceil(image.getWidth() / tileWidth) - 1;
                const numTilesHigh = Math.ceil(image.getHeight() / tileHeight) - 1;

                const newImage = new Jimp(image.getWidth(), image.getHeight());

                for (let y = 0; y <= numTilesHigh; y++) {
                    for (let x = 0; x <= numTilesWide; x++) {
                        let tileX = x;
                        let tileY = y;

                        if (x < numTilesWide) {
                            tileX = (numTilesWide - x + s) % numTilesWide;
                        }

                        if (y < numTilesHigh) {
                            tileY = (numTilesHigh - y + s) % numTilesHigh;
                        }

                        const sx = tileX * tileWidth;
                        const sy = tileY * tileHeight;
                        const sw = Math.min(tileWidth, image.getWidth() - x * tileWidth);
                        const sh = Math.min(tileHeight, image.getHeight() - y * tileHeight);
                        const dx = x * tileWidth;
                        const dy = y * tileHeight;

                        const tile = image.clone().crop(sx, sy, sw, sh);
                        newImage.blit(tile, dx, dy);
                    }
                }

                const base64Data = await newImage.getBase64Async(Jimp.MIME_PNG);
                resolve(base64Data);
            } catch (error) {
                reject(error);
            }
        });
    }

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            const results: IProviderResult[] = [];

            try {
                const data = await (
                    await this.request(`${this.url}/filter?keyword=${encodeURIComponent("Mushoku Tensei")}&sort=recently_updated`, {
                        proxy: proxyURL,
                    })
                ).text();

                const $ = load(data);

                const requestPromises: Promise<void>[] = [];

                $("main div.container div.original div.unit").map((_, el) => {
                    const id = $(el).find("a").attr("href") ?? "";

                    requestPromises.push(
                        this.request(`${this.url}${id}`, {
                            proxy: proxyURL,
                        }).then(async (response) => {
                            const secondReq = await response.text();
                            const $$ = load(secondReq);

                            const altTitles =
                                $$("main div#manga-page div.info h6")
                                    ?.first()
                                    ?.text()
                                    ?.split("; ")
                                    ?.map((s) => s.trim()) ?? [];
                            const year = $$("main div#manga-page div.meta").text()?.split("Published: ")[1]?.split(" to")[0]?.trim();

                            results.push({
                                id,
                                altTitles,
                                format: MediaFormat.UNKNOWN,
                                img: $(el).find("img").attr("src") ?? "",
                                title: $(el).find("div.info a").first()?.text()?.trim(),
                                year: year ? new Date(year).getFullYear() : 0,
                                providerId: this.id,
                            });
                        }),
                    );
                });

                await Promise.all(requestPromises);

                return results.length > 0;
            } catch {
                return false;
            }
        } catch {
            return false;
        }
    }
}

interface IImageResponse {
    status: number;
    result: {
        images: [[string, number, number]];
    };
    message: string;
    messages: string[];
}
