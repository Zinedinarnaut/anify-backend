import { expect, test } from "bun:test";
import lib from "../../../lib";
import { env } from "../../../env";
import { StreamingServers, SubType } from "../../../types/impl/mappings/impl/anime";

test(
    "Content.SourcesHandler",
    async (done) => {
        const sources = await lib.content.loadSources("gogoanime", "/mushoku-tensei-isekai-ittara-honki-dasu-episode-1", SubType.SUB, StreamingServers.GogoCDN);

        if (env.DEBUG) {
            console.log(sources);
        }

        expect(sources).toBeDefined();
        expect(sources).not.toBeEmpty();

        done();
    },
    {
        timeout: 30000,
    },
);
