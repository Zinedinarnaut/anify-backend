import type { IImage } from "../";
import { readUInt32BE } from "../../../../../helper/impl/image-size/impl/utils";

export const J2C: IImage = {
    // TODO: this doesn't seem right. SIZ marker doesn't have to be right after the SOC
    validate: (input) => readUInt32BE(input, 0) === 0xff4fff51,

    calculate: (input) => ({
        height: readUInt32BE(input, 12),
        width: readUInt32BE(input, 8),
    }),
};
