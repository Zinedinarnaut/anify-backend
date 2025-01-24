import { expect, test } from "bun:test";
import lib from "../../../lib";
import { env } from "../../../env";

test(
    "Content.PagesHandler",
    async (done) => {
        const pages = await lib.content.loadPages("mangadex", "9d643e4f-a571-40da-82ee-10a1f6fca8cb");

        if (env.DEBUG) {
            console.log(pages);
        }

        expect(pages).toBeDefined();
        expect(pages).not.toBeEmpty();

        done();
    },
    {
        timeout: 30000,
    },
);
