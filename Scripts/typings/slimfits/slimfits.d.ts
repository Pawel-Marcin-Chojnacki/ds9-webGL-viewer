declare module slimfits {
    interface Keyword {
        key: string;
        value: any;
        comment: string;
    }
}
declare module slimfits.io {
    class reader {
        registeredDataReaders: Array<slimfits.io.datareaders.IDataReader>;
        constructor();
        readFits(view: Uint8Array): {
            fits: any;
            bytesRead: number;
        };
        readHdu(array: Uint8Array): {
            hdu: any;
            bytesRead: number;
        };
        readHeader(view: Uint8Array): {
            header: Array<Keyword>;
            bytesRead: number;
        };
        readData(view: Uint8Array, header: Array<Keyword>): {
            data: any;
            bytesRead: number;
        };
    }
}
declare module slimfits.utils {
    interface IAsciiConverter {
        length: number;
        pattern: string;
        convert(value: any): any;
        convertBack(value: string): any;
        empty(length: number): any;
    }
    class StringAsciiConverter implements IAsciiConverter {
        length: number;
        pattern: string;
        constructor();
        convert(value: string): string;
        convertBack(value: string): string;
        empty(length: number): any[];
        fitsFormat(): string;
    }
    class Int32AsciiConverter implements IAsciiConverter {
        length: number;
        pattern: string;
        constructor();
        convert(value: number): string;
        convertBack(value: string): number;
        empty(length: number): Int32Array;
    }
    class Float32AsciiConverter implements IAsciiConverter {
        length: number;
        digits: number;
        pattern: string;
        constructor();
        convert(value: number): string;
        convertBack(value: string): number;
        empty(length: number): Float32Array;
    }
    class Float64AsciiConverter implements IAsciiConverter {
        length: number;
        digits: number;
        pattern: string;
        constructor();
        convert(value: number): string;
        convertBack(value: string): number;
        empty(length: number): Float64Array;
    }
    var AsciiConverters: {
        registeredConverters: {};
    };
}
declare module slimfits.utils {
    var AsciiConvertManager: {
        getConverterFor: (value: any) => any;
    };
}
declare module slimfits.utils {
    interface IBinaryConverter {
        width: number;
        format: string;
        elementSize: number;
        create(buffer: ArrayBuffer, offset: number, length: number): any;
    }
    class CharBinaryConverter implements IBinaryConverter {
        width: number;
        format: string;
        elementSize: number;
        constructor(width: number);
        create(buffer: ArrayBuffer, offset: number, length: number): any;
    }
    class Int16BinaryConverter implements IBinaryConverter {
        width: number;
        format: string;
        elementSize: number;
        constructor(width: number);
        create(buffer: ArrayBuffer, offset: number, length: number): Int16Array;
    }
    class Int32BinaryConverter implements IBinaryConverter {
        width: number;
        format: string;
        elementSize: number;
        constructor(width: number);
        create(buffer: ArrayBuffer, offset: number, length: number): Int32Array;
    }
    class Int64BinaryConverter implements IBinaryConverter {
        width: number;
        format: string;
        elementSize: number;
        constructor(width: number);
        create(buffer: ArrayBuffer, offset: number, length: number): void;
    }
    class Float32BinaryConverter implements IBinaryConverter {
        width: number;
        format: string;
        elementSize: number;
        constructor(width: number);
        create(buffer: ArrayBuffer, offset: number, length: number): Float32Array;
    }
    class Float64BinaryConverter implements IBinaryConverter {
        width: number;
        format: string;
        elementSize: number;
        constructor(width: number);
        create(buffer: ArrayBuffer, offset: number, length: number): Float64Array;
    }
    var BinaryConverters: {
        registeredConverters: {};
    };
}
declare module slimfits.utils {
    var BinaryConvertManager: {
        getConverterFor: (format: string, width: number) => any;
        convertBack: (buffer: ArrayBuffer, offset: number, length: number, height: number, converter: IBinaryConverter) => any;
    };
}
declare module slimfits.utils {
    var Constants: {
        blockLength: number;
        lineLength: number;
        keyLength: number;
        maxKeywordsInBlock: number;
    };
}
declare module slimfits.utils {
    var EndianessConverter: {
        convert: (rawBytes: Uint8Array, sizeOfType: number, startIndex?: number, length?: number) => void;
    };
}
declare module slimfits.utils {
    var KeywordsManager: {
        convert: (value: any) => any;
        convertBack: (value: any, name: string) => any;
        single: (header: Keyword[], key: string) => any;
    };
}
declare module slimfits.utils {
    var Math: {
        minMax: (arr: any) => {
            min: any;
            max: any;
        };
        subbuffer: (buffer: any, offset: any, bytesLength: any) => any;
    };
}
declare module slimfits.utils {
    var RegisteredTypes: {
        valueForType: (type: string) => number;
        typeForValue: (value: number) => string;
    };
}
declare module slimfits.utils {
    interface IConverter {
        convert(value: any): any;
        convertBack(value: string): any;
    }
    class StringConverter implements IConverter {
        convert(value: string): string;
        convertBack(value: string): string;
    }
    class IntConverter implements IConverter {
        convert(value: number): string;
        convertBack(value: string): number;
    }
    class FloatConverter implements IConverter {
        convert(value: number): string;
        convertBack(value: string): number;
    }
    class DateConverter implements IConverter {
        convert(value: Date): string;
        convertBack(stringValue: string): Date;
    }
    class BooleanConverter implements IConverter {
        convert(value: boolean): string;
        convertBack(stringValue: string): boolean;
    }
    class BitPixConverter implements IConverter {
        convert(value: any): number;
        convertBack(value: string): string;
    }
    var ValueConverters: {
        registeredNames: {
            BITPIX: BitPixConverter;
            NAXIS: IntConverter;
            NAXIS1: IntConverter;
            NAXIS2: IntConverter;
            NAXIS3: IntConverter;
            YBINNING: IntConverter;
            XBINNING: IntConverter;
            PCOUNT: IntConverter;
            GCOUNT: IntConverter;
            NSEGMENT: IntConverter;
            BSCALE: FloatConverter;
            BZERO: FloatConverter;
            EPOCH: FloatConverter;
            EQUINOX: FloatConverter;
            ALTRVAL: FloatConverter;
            ALTRPIX: FloatConverter;
            RESTFREQ: FloatConverter;
            DATAMAX: FloatConverter;
            DATAMIN: FloatConverter;
            RA: FloatConverter;
            DEC: FloatConverter;
            OBSRA: FloatConverter;
            OBSDEC: FloatConverter;
            XSHIFT: FloatConverter;
            YSHIFT: FloatConverter;
            ORBEPOCH: DateConverter;
            SIMPLE: BooleanConverter;
            GROUPS: BooleanConverter;
            BLOCKED: BooleanConverter;
            EXTEND: BooleanConverter;
            SEQVALID: BooleanConverter;
            TFIELDS: IntConverter;
        };
        registeredPrefixedNames: {
            NAXIS: IntConverter;
            NSEG: IntConverter;
            DATE: DateConverter;
            CRVAL: FloatConverter;
            CDELT: FloatConverter;
            CRPIX: FloatConverter;
            CROTA: FloatConverter;
            PHAS: FloatConverter;
            PSCAL: FloatConverter;
            PZERO: FloatConverter;
            SDLT: FloatConverter;
            SRVL: FloatConverter;
            SRPX: FloatConverter;
            DBJD: FloatConverter;
            "THDA-": FloatConverter;
        };
        registeredTypes: {
            int: IntConverter;
            float: FloatConverter;
            string: StringConverter;
            date: DateConverter;
            boolean: BooleanConverter;
        };
        defaultConverter: StringConverter;
    };
}
declare module slimfits.io.datareaders {
    var asciiTableDataReader: IDataReader;
}
declare module slimfits.io.datareaders {
    var binaryTableDataReader: IDataReader;
}
declare module slimfits.io.datareaders {
    interface IDataReader {
        readData(array: Uint8Array, header: Array<Keyword>): {
            data: any;
            bytesRead: number;
        };
        canReadData(header: Array<Keyword>): boolean;
    }
}
declare module slimfits.io.datareaders {
    var randomGroupsDataReader: IDataReader;
}
declare module slimfits.io.datareaders {
    var simpleDataReader: IDataReader;
}
