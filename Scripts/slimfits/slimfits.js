// polyfill for IE 
if (!ArrayBuffer.prototype.hasOwnProperty("slice"))
    ArrayBuffer.prototype["slice"] = function (start, end) {
        if (end == undefined)
            end = that.length;
        var length = end - start;
        var lengthDouble = Math.floor(length / Float64Array.BYTES_PER_ELEMENT); // length of double array
        // returned 
        var result = new ArrayBuffer(end - start);
        // copying 8 bytes at a time
        var resultArray = new Float64Array(result, 0, lengthDouble);
        var that = new Float64Array(this, start, lengthDouble);
        for (var i = 0; i < resultArray.length; i++)
            resultArray[i] = that[i];
        // copying over the remaining bytes
        that = new Uint8Array(this, start + lengthDouble * Float64Array.BYTES_PER_ELEMENT);
        resultArray = new Uint8Array(result, lengthDouble * Float64Array.BYTES_PER_ELEMENT);
        for (var i = 0; i < resultArray.length; i++)
            resultArray[i] = that[i];
        return result;
    };
var slimfits;
(function (slimfits) {
    var io;
    (function (io) {
        var reader = (function () {
            function reader() {
                this.registeredDataReaders = [
                    slimfits.io.datareaders.simpleDataReader,
                    slimfits.io.datareaders.asciiTableDataReader,
                    slimfits.io.datareaders.binaryTableDataReader,
                    slimfits.io.datareaders.randomGroupsDataReader
                ];
            }
            reader.prototype.readFits = function (view) {
                var Constants = slimfits.utils.Constants;
                var hdus = [];
                var currentPosition = view.byteOffset;
                var bytesRead = 0;
                var length = view.buffer.byteLength;
                var result;
                while (true) {
                    result = this.readHdu(view);
                    currentPosition += result.bytesRead;
                    bytesRead += result.bytesRead;
                    view = new Uint8Array(view.buffer, currentPosition);
                    hdus.push(result.hdu);
                    if (bytesRead < length) {
                        continue;
                    }
                    else {
                        var f = {
                            fits: {
                                hdus: hdus
                            },
                            bytesRead: bytesRead
                        };
                        return f;
                    }
                }
            };
            reader.prototype.readHdu = function (array) {
                var data_result;
                var s;
                var KeywordManager = slimfits.utils.KeywordsManager;
                var header_result;
                var naxis;
                var data = [];
                var hasData = false;
                var header;
                var currentPosition = array.byteOffset;
                var bytesRead = 0;
                var blobLength = array.buffer.byteLength;
                header_result = this.readHeader(array);
                currentPosition += header_result.bytesRead;
                bytesRead += header_result.bytesRead;
                array = new Uint8Array(array.buffer, currentPosition);
                header = header_result.header;
                naxis = KeywordManager.single(header, "NAXIS");
                if ((naxis != null) && naxis.value !== 0) {
                    hasData = true;
                }
                if (hasData) {
                    data_result = this.readData(array, header);
                    data = data_result.data;
                    var typekv = KeywordManager.single(header, "BITPIX");
                    typekv.value = data_result.actualType;
                    currentPosition += data_result.bytesRead;
                    bytesRead += data_result.bytesRead;
                    array = new Uint8Array(array.buffer, currentPosition);
                }
                s = {
                    hdu: {
                        header: header,
                        data: data
                    },
                    bytesRead: bytesRead
                };
                return s;
            };
            reader.prototype.readHeader = function (view) {
                var j;
                var value;
                var Constants = slimfits.utils.Constants;
                var KeywordManager = slimfits.utils.KeywordsManager;
                var endFound = false;
                var comment;
                var key;
                var line;
                var slashIdx;
                var valueString;
                var vAndC;
                var header = [];
                var currentPosition = view.byteOffset;
                var bytesRead = 0;
                var part = new Uint8Array(view.buffer, currentPosition, Constants.blockLength);
                var block = String.fromCharCode.apply(null, part);
                currentPosition += Constants.blockLength;
                bytesRead += Constants.blockLength;
                while (true && block !== "") {
                    j = 0;
                    while (j < Constants.maxKeywordsInBlock) {
                        line = block.substring(j * Constants.lineLength, (j + 1) * Constants.lineLength);
                        if (line.indexOf("END     ", 0) === 0) {
                            endFound = true;
                            break;
                        }
                        key = void 0;
                        valueString = void 0;
                        comment = void 0;
                        key = line.substring(0, Constants.keyLength).trim();
                        if (line.substr(Constants.keyLength, 2) === "= ") {
                            vAndC = void 0;
                            value = void 0;
                            slashIdx = void 0;
                            if (line.charAt(31) === "/") {
                                valueString = line.substr(10, 21);
                                vAndC = line.substr(31);
                                slashIdx = 0;
                            }
                            else {
                                vAndC = line.substr(10, Constants.lineLength - 10);
                                slashIdx = vAndC.lastIndexOf(" /");
                                valueString = (slashIdx === -1 ? vAndC : vAndC.substring(0, slashIdx));
                            }
                            value = KeywordManager.convertBack(valueString.trim(), key);
                            if (slashIdx !== -1) {
                                comment = vAndC.substr(slashIdx + 1).trim();
                                if (comment !== "") {
                                    header.push({
                                        key: key,
                                        value: value,
                                        comment: comment
                                    });
                                }
                                else {
                                    header.push({
                                        key: key,
                                        value: value,
                                        comment: null
                                    });
                                }
                            }
                            else {
                                header.push({
                                    key: key,
                                    value: value,
                                    comment: null
                                });
                            }
                        }
                        else {
                            valueString = line.substr(Constants.keyLength, Constants.lineLength - Constants.keyLength);
                            header.push({
                                key: key,
                                value: valueString,
                                comment: null
                            });
                        }
                        j++;
                    }
                    if (endFound) {
                        break;
                    }
                    else {
                        part = new Uint8Array(view.buffer, currentPosition, Constants.blockLength);
                        block = String.fromCharCode.apply(null, part);
                        currentPosition += Constants.blockLength;
                        bytesRead += Constants.blockLength;
                    }
                }
                return {
                    header: header,
                    bytesRead: bytesRead
                };
            };
            reader.prototype.readData = function (view, header) {
                var _reader;
                var i = 0;
                while (i < this.registeredDataReaders.length) {
                    _reader = this.registeredDataReaders[i];
                    if (_reader.canReadData(header)) {
                        return _reader.readData(view, header);
                    }
                    i++;
                }
                console.log("SlimFits was unable to read this file.");
                throw {
                    name: "SlimFitsError",
                    message: "SlimFits was unable to read this file."
                };
            };
            return reader;
        })();
        io.reader = reader;
    })(io = slimfits.io || (slimfits.io = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var utils;
    (function (utils) {
        var StringAsciiConverter = (function () {
            function StringAsciiConverter() {
                this.length = 0;
                this.pattern = "A\\d{1,}";
            }
            StringAsciiConverter.prototype.convert = function (value) {
                if (value.length > this.length) {
                    console.log('StringAsciiConverter: Value ' + value + ' has too many characters');
                }
                return value.substr(0, length);
            };
            StringAsciiConverter.prototype.convertBack = function (value) {
                return value.trim();
            };
            StringAsciiConverter.prototype.empty = function (length) {
                return [];
            };
            StringAsciiConverter.prototype.fitsFormat = function () {
                return 'A' + this.length;
            };
            return StringAsciiConverter;
        })();
        utils.StringAsciiConverter = StringAsciiConverter;
        var Int32AsciiConverter = (function () {
            function Int32AsciiConverter() {
                this.length = 0;
                this.pattern = "I\\d{1,}";
            }
            Int32AsciiConverter.prototype.convert = function (value) {
                var retVal = value.toString();
                if (retVal.length > this.length) {
                    console.log('Int32AsciiConverter: Value ' + retVal + ' has to many characters');
                }
                return retVal;
            };
            Int32AsciiConverter.prototype.convertBack = function (value) {
                var val = value.replace(/[\n\r ]/g, '');
                if (val === '') {
                    return 0;
                }
                var retVal = parseInt(val);
                if (isNaN(retVal)) {
                    console.log('Int32AsciiConverter: value \'' + val + '\' is not a number.');
                }
                return retVal;
            };
            Int32AsciiConverter.prototype.empty = function (length) {
                return new Int32Array(length);
            };
            return Int32AsciiConverter;
        })();
        utils.Int32AsciiConverter = Int32AsciiConverter;
        var Float32AsciiConverter = (function () {
            function Float32AsciiConverter() {
                this.length = 0;
                this.digits = 0;
                this.pattern = "F\\d{1,}\\.?\\d{0,}";
            }
            Float32AsciiConverter.prototype.convert = function (value) {
                var retVal = value.toString();
                if (retVal.length > length) {
                    console.log('Float32AsciiConverter: Value ' + retVal + ' has to many characters');
                }
                return retVal;
            };
            Float32AsciiConverter.prototype.convertBack = function (value) {
                var val = value.replace(/[\n\r ]/g, '');
                if (val === '') {
                    return 0;
                }
                var retVal = parseFloat(val);
                if (isNaN(retVal)) {
                    console.log('Float32AsciiConverter: value \'' + val + '\' is not a number.');
                }
                return retVal;
            };
            Float32AsciiConverter.prototype.empty = function (length) {
                return new Float32Array(length);
            };
            return Float32AsciiConverter;
        })();
        utils.Float32AsciiConverter = Float32AsciiConverter;
        var Float64AsciiConverter = (function () {
            function Float64AsciiConverter() {
                this.length = 0;
                this.digits = 0;
                this.pattern = "(D|E)\\d{1,}\\.?\\d{0,}";
            }
            Float64AsciiConverter.prototype.convert = function (value) {
                var retVal = value.toString();
                if (retVal.length > length) {
                    console.log('Float64AsciiConverter: Value ' + retVal + ' has to many characters');
                }
                return retVal;
            };
            Float64AsciiConverter.prototype.convertBack = function (value) {
                var val = value.replace(/[\n\r ]/g, '');
                if (val === '') {
                    return 0;
                }
                var retVal = parseFloat(val);
                if (isNaN(retVal)) {
                    console.log('Float64AsciiConverter: value \'' + val + '\' is not a number.');
                }
                return retVal;
            };
            Float64AsciiConverter.prototype.empty = function (length) {
                return new Float64Array(length);
            };
            return Float64AsciiConverter;
        })();
        utils.Float64AsciiConverter = Float64AsciiConverter;
        var stringConverter = new StringAsciiConverter();
        var intConverter = new Int32AsciiConverter();
        var floatConverter = new Float32AsciiConverter();
        var doubleConverter = new Float64AsciiConverter();
        var converters = {};
        converters[stringConverter.pattern] = StringAsciiConverter;
        converters[intConverter.pattern] = Int32AsciiConverter;
        converters[floatConverter.pattern] = Float32AsciiConverter;
        converters[doubleConverter.pattern] = Float64AsciiConverter;
        utils.AsciiConverters = {
            registeredConverters: converters
        };
    })(utils = slimfits.utils || (slimfits.utils = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var utils;
    (function (utils) {
        var getConverterFor = function (value) {
            var AsciiConverters = slimfits.utils.AsciiConverters;
            var keys = Object.keys(AsciiConverters.registeredConverters);
            var i = 0;
            var key = undefined;
            var regex = undefined;
            while (i < keys.length) {
                key = keys[i];
                regex = new RegExp(key);
                if (regex.test(value)) {
                    return new AsciiConverters.registeredConverters[key]();
                }
                i++;
            }
            return console.log("AsciiConvertManager: No converter registered for " + value);
        };
        utils.AsciiConvertManager = {
            getConverterFor: getConverterFor
        };
    })(utils = slimfits.utils || (slimfits.utils = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var utils;
    (function (utils) {
        var subbuffer = function (buffer, offset, bytesLength) {
            var idx, newBuffer, newBytes, rawBytes;
            rawBytes = new Uint8Array(buffer);
            newBuffer = new ArrayBuffer(bytesLength);
            newBytes = new Uint8Array(newBuffer);
            idx = 0;
            while (idx < bytesLength) {
                newBytes[idx] = rawBytes[idx + offset];
                idx++;
            }
            return newBuffer;
        };
        var CharBinaryConverter = (function () {
            function CharBinaryConverter(width) {
                this.width = width;
                this.format = 'A';
                this.elementSize = 1;
            }
            CharBinaryConverter.prototype.create = function (buffer, offset, length) {
                var arr = new Uint8Array(buffer, offset, length);
                return String.fromCharCode.apply(null, arr);
            };
            return CharBinaryConverter;
        })();
        utils.CharBinaryConverter = CharBinaryConverter;
        var Int16BinaryConverter = (function () {
            function Int16BinaryConverter(width) {
                this.width = width;
                this.format = 'I';
                this.elementSize = 2;
            }
            Int16BinaryConverter.prototype.create = function (buffer, offset, length) {
                if (length === 0) {
                    return null;
                }
                return new Int16Array(subbuffer(buffer, offset, length));
            };
            return Int16BinaryConverter;
        })();
        utils.Int16BinaryConverter = Int16BinaryConverter;
        var Int32BinaryConverter = (function () {
            function Int32BinaryConverter(width) {
                this.width = width;
                this.format = 'J';
                this.elementSize = 4;
            }
            Int32BinaryConverter.prototype.create = function (buffer, offset, length) {
                if (length === 0) {
                    return null;
                }
                return new Int32Array(subbuffer(buffer, offset, length));
            };
            return Int32BinaryConverter;
        })();
        utils.Int32BinaryConverter = Int32BinaryConverter;
        var Int64BinaryConverter = (function () {
            function Int64BinaryConverter(width) {
                this.width = width;
                this.format = 'K';
                this.elementSize = 8;
            }
            Int64BinaryConverter.prototype.create = function (buffer, offset, length) {
                console.log('There is no TypedArray for long type');
            };
            return Int64BinaryConverter;
        })();
        utils.Int64BinaryConverter = Int64BinaryConverter;
        var Float32BinaryConverter = (function () {
            function Float32BinaryConverter(width) {
                this.width = width;
                this.format = 'E';
                this.elementSize = 4;
            }
            Float32BinaryConverter.prototype.create = function (buffer, offset, length) {
                if (length === 0) {
                    return null;
                }
                return new Float32Array(subbuffer(buffer, offset, length));
            };
            return Float32BinaryConverter;
        })();
        utils.Float32BinaryConverter = Float32BinaryConverter;
        var Float64BinaryConverter = (function () {
            function Float64BinaryConverter(width) {
                this.width = width;
                this.format = 'D';
                this.elementSize = 8;
            }
            Float64BinaryConverter.prototype.create = function (buffer, offset, length) {
                if (length === 0) {
                    return null;
                }
                return new Float64Array(subbuffer(buffer, offset, length));
            };
            return Float64BinaryConverter;
        })();
        utils.Float64BinaryConverter = Float64BinaryConverter;
        var converters = {};
        converters['A'] = function (width) {
            return new CharBinaryConverter(width);
        };
        converters['I'] = function (width) {
            return new Int16BinaryConverter(width);
        };
        converters['J'] = function (width) {
            return new Int32BinaryConverter(width);
        };
        converters['K'] = function (width) {
            return new Int64BinaryConverter(width);
        };
        converters['E'] = function (width) {
            return new Float32BinaryConverter(width);
        };
        converters['D'] = function (width) {
            return new Float64BinaryConverter(width);
        };
        utils.BinaryConverters = { registeredConverters: converters };
    })(utils = slimfits.utils || (slimfits.utils = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var utils;
    (function (utils) {
        var getConverterFor = function (format, width) {
            var BinaryConverters = slimfits.utils.BinaryConverters;
            var keys = Object.keys(BinaryConverters.registeredConverters);
            var i = 0;
            while (i < keys.length) {
                var key = keys[i];
                if (key === format) {
                    return BinaryConverters.registeredConverters[key](width);
                }
                i++;
            }
            console.log("BinaryConvertManager: No converter registered for " + format);
        };
        var convertBack = function (buffer, offset, length, height, converter) {
            var EndianessConverter = slimfits.utils.EndianessConverter;
            var elementSize = converter.elementSize;
            var changeEndian = true;
            if (changeEndian) {
                var rawBytes = new Uint8Array(buffer);
            }
            if (changeEndian) {
                EndianessConverter.convert(rawBytes, elementSize, offset, length);
            }
            return converter.create(buffer, offset, length);
        };
        utils.BinaryConvertManager = {
            getConverterFor: getConverterFor,
            convertBack: convertBack
        };
    })(utils = slimfits.utils || (slimfits.utils = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var utils;
    (function (utils) {
        utils.Constants = {
            blockLength: 2880,
            lineLength: 80,
            keyLength: 8,
            maxKeywordsInBlock: 36
        };
    })(utils = slimfits.utils || (slimfits.utils = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var utils;
    (function (utils) {
        var convert2 = function (rawBytes, startIndex, length) {
            var tmp = void 0;
            var i = startIndex;
            length += startIndex;
            while (i < length) {
                tmp = rawBytes[i];
                rawBytes[i] = rawBytes[i + 1];
                rawBytes[i + 1] = tmp;
                i += 2;
            }
        };
        var convert4 = function (rawBytes, startIndex, length) {
            var tmp = void 0;
            var i = startIndex;
            length += startIndex;
            while (i < length) {
                tmp = rawBytes[i];
                rawBytes[i] = rawBytes[i + 3];
                rawBytes[i + 3] = tmp;
                tmp = rawBytes[i + 1];
                rawBytes[i + 1] = rawBytes[i + 2];
                rawBytes[i + 2] = tmp;
                i += 4;
            }
        };
        var convert8 = function (rawBytes, startIndex, length) {
            var tmp = void 0;
            var i = startIndex;
            length += startIndex;
            while (i < length) {
                tmp = rawBytes[i];
                rawBytes[i] = rawBytes[i + 7];
                rawBytes[i + 7] = tmp;
                tmp = rawBytes[i + 1];
                rawBytes[i + 1] = rawBytes[i + 6];
                rawBytes[i + 6] = tmp;
                tmp = rawBytes[i + 2];
                rawBytes[i + 2] = rawBytes[i + 5];
                rawBytes[i + 5] = tmp;
                tmp = rawBytes[i + 3];
                rawBytes[i + 3] = rawBytes[i + 4];
                rawBytes[i + 4] = tmp;
                i += 8;
            }
        };
        var convertAny = function (rawBytes, sizeOfType, startIndex, length) {
            var h, lower, tmp, upper;
            var tmp = void 0;
            var i = 0;
            var halfSize = sizeOfType / 2;
            var _length = length / sizeOfType;
            while (i < _length) {
                h = 0;
                while (h < halfSize) {
                    upper = startIndex + sizeOfType * (i + 1) - 1 - h;
                    lower = startIndex + sizeOfType * i + h;
                    tmp = rawBytes[lower];
                    rawBytes[lower] = rawBytes[upper];
                    rawBytes[upper] = rawBytes[lower];
                    h++;
                }
                i += sizeOfType;
            }
        };
        var convert = function (rawBytes, sizeOfType, startIndex, length) {
            if (startIndex == null) {
                startIndex = 0;
            }
            if (length == null) {
                length = rawBytes.length;
            }
            switch (sizeOfType) {
                case 1:
                    break;
                case 2:
                    return convert2(rawBytes, startIndex, length);
                case 4:
                    return convert4(rawBytes, startIndex, length);
                case 8:
                    return convert8(rawBytes, startIndex, length);
                default:
                    return convertAny(rawBytes, sizeOfType, startIndex, length);
            }
        };
        utils.EndianessConverter = { convert: convert };
    })(utils = slimfits.utils || (slimfits.utils = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var utils;
    (function (utils) {
        var getConverterByName = function (name) {
            var Converters = slimfits.utils.ValueConverters;
            if (name in Converters.registeredNames) {
                return Converters.registeredNames[name];
            }
            var keys = Object.keys(Converters.registeredPrefixedNames);
            var i = 0;
            var key;
            while (i < keys.length) {
                key = keys[i];
                if (name.indexOf(key) === 0) {
                    return Converters.registeredPrefixedNames[key];
                }
                i++;
            }
            return Converters.defaultConverter;
        };
        var getConverterByType = function (type) {
            var Converters = slimfits.utils.ValueConverters;
            if (type in Converters.registeredTypes) {
                return Converters.registeredTypes[type];
            }
            return Converters.defaultConverter;
        };
        var isInt = function (n) {
            return typeof n === "number" && parseFloat(n) === parseInt(n, 10) && !isNaN(n);
        };
        var convert = function (value) {
            var jsType = typeof value;
            if (jsType === "number") {
                jsType = (isInt(value) ? "int" : "float");
            }
            if (jsType === "object" ? value.getMonth : void 0) {
                jsType = "date";
            }
            return getConverterByType(jsType);
        };
        var convertBack = function (value, name) {
            var converter = getConverterByName(name);
            return converter.convertBack(value);
        };
        var single = function (header, key) {
            var i = 0;
            while (i < header.length) {
                if (header[i].key.indexOf(key, 0) === 0) {
                    return header[i];
                }
                i++;
            }
            return null;
        };
        utils.KeywordsManager = {
            convert: convert,
            convertBack: convertBack,
            single: single
        };
    })(utils = slimfits.utils || (slimfits.utils = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var utils;
    (function (utils) {
        var minMax = function (arr) {
            var i, max, min;
            max = -Number.MAX_VALUE;
            min = Number.MAX_VALUE;
            i = 0;
            while (i < arr.length) {
                if (arr[i] > max) {
                    max = arr[i];
                }
                if (arr[i] < min) {
                    min = arr[i];
                }
                i++;
            }
            return {
                min: min,
                max: max
            };
        };
        var subbuffer = function (buffer, offset, bytesLength) {
            var idx, newBuffer, newBytes, rawBytes;
            rawBytes = new Uint8Array(buffer);
            newBuffer = new ArrayBuffer(bytesLength);
            newBytes = new Uint8Array(newBuffer);
            idx = 0;
            while (idx < bytesLength) {
                newBytes[idx] = rawBytes[idx + offset];
                idx++;
            }
            return newBuffer;
        };
        utils.Math = {
            minMax: minMax,
            subbuffer: subbuffer
        };
    })(utils = slimfits.utils || (slimfits.utils = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var utils;
    (function (utils) {
        var registeredBitPixTable = {
            Uint8: 8,
            Int16: 16,
            Int32: 32,
            Int64: 64,
            Float32: -32,
            Float64: -64
        };
        var valueForType = function (type) {
            if (type in registeredBitPixTable) {
                return registeredBitPixTable[type];
            }
            else {
                return null;
            }
        };
        var typeForValue = function (value) {
            var i, keyList, type;
            i = void 0;
            keyList = Object.keys(registeredBitPixTable);
            i = 0;
            while (i < keyList.length) {
                type = keyList[i];
                if (registeredBitPixTable[type] === value) {
                    return type;
                }
                i++;
            }
            return null;
        };
        utils.RegisteredTypes = {
            valueForType: valueForType,
            typeForValue: typeForValue
        };
    })(utils = slimfits.utils || (slimfits.utils = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var utils;
    (function (utils) {
        var StringConverter = (function () {
            function StringConverter() {
            }
            StringConverter.prototype.convert = function (value) {
                console.log("StringFitsValueConverter.convert: " + value.toString());
                value.replace(/\'/g, "''");
                return value;
            };
            StringConverter.prototype.convertBack = function (value) {
                if (value.charAt(0) === "'") {
                    value = value.substr(1);
                }
                if (value.charAt(value.length - 1) === "'") {
                    value = value.substr(0, value.length - 1);
                }
                return value.replace(/\'\'/g, "'").toString().trim();
            };
            return StringConverter;
        })();
        utils.StringConverter = StringConverter;
        var IntConverter = (function () {
            function IntConverter() {
            }
            IntConverter.prototype.convert = function (value) {
                return value.toString();
            };
            IntConverter.prototype.convertBack = function (value) {
                return parseInt(value);
            };
            return IntConverter;
        })();
        utils.IntConverter = IntConverter;
        var FloatConverter = (function () {
            function FloatConverter() {
            }
            FloatConverter.prototype.convert = function (value) {
                return value.toString();
            };
            FloatConverter.prototype.convertBack = function (value) {
                return parseFloat(value);
            };
            return FloatConverter;
        })();
        utils.FloatConverter = FloatConverter;
        var DateConverter = (function () {
            function DateConverter() {
            }
            DateConverter.prototype.convert = function (value) {
                console.log("DateFitsValueConverter.convert not implemented.");
                return "";
            };
            DateConverter.prototype.convertBack = function (stringValue) {
                if (stringValue[0] === "'") {
                    stringValue = stringValue.slice(1);
                }
                if (stringValue[stringValue.length - 1] === "'") {
                    stringValue = stringValue.slice(0, stringValue.length - 1);
                }
                if (isNaN(Date.parse(stringValue))) {
                    console.log("DateFitsValueConverter.convertBack error parsing " + stringValue);
                    return null;
                }
                return new Date(stringValue);
            };
            return DateConverter;
        })();
        utils.DateConverter = DateConverter;
        var BooleanConverter = (function () {
            function BooleanConverter() {
            }
            BooleanConverter.prototype.convert = function (value) {
                if (value) {
                    return "T";
                }
                else {
                    return "F";
                }
            };
            BooleanConverter.prototype.convertBack = function (stringValue) {
                return stringValue.toString().trim().toUpperCase() === "T";
            };
            return BooleanConverter;
        })();
        utils.BooleanConverter = BooleanConverter;
        var BitPixConverter = (function () {
            function BitPixConverter() {
            }
            BitPixConverter.prototype.convert = function (value) {
                return slimfits.utils.RegisteredTypes.valueForType(value);
            };
            BitPixConverter.prototype.convertBack = function (value) {
                return slimfits.utils.RegisteredTypes.typeForValue(parseInt(value));
            };
            return BitPixConverter;
        })();
        utils.BitPixConverter = BitPixConverter;
        var registeredNames = {
            BITPIX: new BitPixConverter(),
            NAXIS: new IntConverter(),
            NAXIS1: new IntConverter(),
            NAXIS2: new IntConverter(),
            NAXIS3: new IntConverter(),
            YBINNING: new IntConverter(),
            XBINNING: new IntConverter(),
            PCOUNT: new IntConverter(),
            GCOUNT: new IntConverter(),
            NSEGMENT: new IntConverter(),
            BSCALE: new FloatConverter(),
            BZERO: new FloatConverter(),
            EPOCH: new FloatConverter(),
            EQUINOX: new FloatConverter(),
            ALTRVAL: new FloatConverter(),
            ALTRPIX: new FloatConverter(),
            RESTFREQ: new FloatConverter(),
            DATAMAX: new FloatConverter(),
            DATAMIN: new FloatConverter(),
            RA: new FloatConverter(),
            DEC: new FloatConverter(),
            OBSRA: new FloatConverter(),
            OBSDEC: new FloatConverter(),
            XSHIFT: new FloatConverter(),
            YSHIFT: new FloatConverter(),
            ORBEPOCH: new DateConverter(),
            SIMPLE: new BooleanConverter(),
            GROUPS: new BooleanConverter(),
            BLOCKED: new BooleanConverter(),
            EXTEND: new BooleanConverter(),
            SEQVALID: new BooleanConverter(),
            TFIELDS: new IntConverter()
        };
        var registeredPrefixedNames = {
            NAXIS: new IntConverter(),
            NSEG: new IntConverter(),
            DATE: new DateConverter(),
            CRVAL: new FloatConverter(),
            CDELT: new FloatConverter(),
            CRPIX: new FloatConverter(),
            CROTA: new FloatConverter(),
            PHAS: new FloatConverter(),
            PSCAL: new FloatConverter(),
            PZERO: new FloatConverter(),
            SDLT: new FloatConverter(),
            SRVL: new FloatConverter(),
            SRPX: new FloatConverter(),
            DBJD: new FloatConverter(),
            "THDA-": new FloatConverter()
        };
        var registeredTypes = {
            int: new IntConverter(),
            float: new FloatConverter(),
            string: new StringConverter(),
            date: new DateConverter(),
            boolean: new BooleanConverter()
        };
        var defaultConverter = new StringConverter();
        utils.ValueConverters = {
            registeredNames: registeredNames,
            registeredPrefixedNames: registeredPrefixedNames,
            registeredTypes: registeredTypes,
            defaultConverter: defaultConverter
        };
    })(utils = slimfits.utils || (slimfits.utils = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var io;
    (function (io) {
        var datareaders;
        (function (datareaders) {
            var readData = function (array, header) {
                var KeywordsManager = slimfits.utils.KeywordsManager;
                var Constants = slimfits.utils.Constants;
                var AsciiConvertManager = slimfits.utils.AsciiConvertManager;
                var rowsCount = KeywordsManager.single(header, "NAXIS2").value;
                var rowLength = KeywordsManager.single(header, "NAXIS1").value;
                var fieldsCount = KeywordsManager.single(header, "TFIELDS").value;
                var asciiconverters = [];
                var positions = [];
                var i = 0;
                var _keyword;
                while (i < header.length) {
                    _keyword = header[i];
                    if (_keyword.key.indexOf('TFORM') === 0) {
                        asciiconverters.push(AsciiConvertManager.getConverterFor(_keyword.value));
                    }
                    if (_keyword.key.indexOf('TBCOL') === 0) {
                        positions.push(_keyword.value - 1);
                    }
                    i++;
                }
                if (positions.length !== fieldsCount) {
                    console.log("There are " + positions.length + " 'TBCOL#' keywords whereas 'TFIELDS' specifies " + fieldsCount);
                }
                positions.push(rowLength);
                var bytesToRead = rowLength * rowsCount;
                var part = array.subarray(0, bytesToRead);
                var buffer = String.fromCharCode.apply(null, part);
                var resultList = [];
                i = 0;
                while (i < asciiconverters.length) {
                    resultList.push(asciiconverters[i].empty(rowsCount));
                    i++;
                }
                var rowIdx = 0;
                var posIdx = 0;
                var line;
                var chunk;
                while (rowIdx < rowsCount) {
                    line = buffer.substr(rowIdx * rowLength, rowLength);
                    posIdx = 0;
                    while (posIdx < fieldsCount) {
                        chunk = line.substr(positions[posIdx], positions[posIdx + 1] - positions[posIdx]);
                        resultList[posIdx][rowIdx] = asciiconverters[posIdx].convertBack(chunk);
                        posIdx++;
                    }
                    rowIdx++;
                }
                var padBytesLength = Math.ceil(bytesToRead / Constants.blockLength) * Constants.blockLength - bytesToRead;
                return {
                    data: resultList,
                    bytesRead: bytesToRead + padBytesLength
                };
            };
            var canReadData = function (header) {
                var i = 0;
                var _keyword;
                while (i < header.length) {
                    _keyword = header[i];
                    if (_keyword.key === "XTENSION" && _keyword.value === "TABLE") {
                        return true;
                    }
                    i++;
                }
                return false;
            };
            datareaders.asciiTableDataReader = {
                readData: readData,
                canReadData: canReadData
            };
        })(datareaders = io.datareaders || (io.datareaders = {}));
    })(io = slimfits.io || (slimfits.io = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var io;
    (function (io) {
        var datareaders;
        (function (datareaders) {
            var readData = function (array, header) {
                var KeywordsManager = slimfits.utils.KeywordsManager;
                var Constants = slimfits.utils.Constants;
                var BinaryConvertManager = slimfits.utils.BinaryConvertManager;
                var rowsCount = KeywordsManager.single(header, "NAXIS2").value;
                var rowLength = KeywordsManager.single(header, "NAXIS1").value;
                var fieldsCount = KeywordsManager.single(header, "TFIELDS").value;
                var theap = KeywordsManager.single(header, "THEAP");
                var heapLength = 0;
                if (theap === !void 0 && theap.value === !void 0) {
                    heapLength = theap.value;
                }
                var rowElementsCount = 0;
                var regex = new RegExp("\\d{0,}\\D");
                var converters = [];
                var i = 0;
                var _keyword;
                var result;
                var count;
                var countString;
                var formatString;
                var format;
                while (i < header.length) {
                    _keyword = header[i];
                    if (_keyword.key.indexOf("TFORM") === 0) {
                        result = regex.exec(_keyword.value);
                        if (result[0] === void 0) {
                            console.log('error here, bro');
                        }
                        count = 1;
                        countString = _keyword.value.substr(0, _keyword.value.length - 1);
                        if (countString !== '') {
                            count = parseInt(countString);
                        }
                        formatString = _keyword.value.substr(_keyword.value.length - 1, 1);
                        if (formatString.length !== 1) {
                            console.log('formatString too long; ' + formatString.length);
                        }
                        format = formatString.charAt(0);
                        rowElementsCount += count;
                        converters.push(BinaryConvertManager.getConverterFor(format, count));
                    }
                    i++;
                }
                var blockSize = converters.length;
                var positions = [];
                var item = converters[0];
                positions.push(0);
                positions.push(item.width * rowsCount * item.elementSize);
                i = 1;
                while (i < blockSize) {
                    item = converters[i];
                    positions[i + 1] = item.width * rowsCount * item.elementSize + positions[i];
                    i++;
                }
                var bytesToRead = rowLength * rowsCount;
                var tmp = array.buffer;
                var buffer = tmp.slice(array.byteOffset, array.byteOffset + bytesToRead);
                var data = [];
                i = 0;
                while (i < blockSize) {
                    data[i] = BinaryConvertManager.convertBack(buffer, positions[i], positions[i + 1] - positions[i], rowsCount, converters[i]);
                    i++;
                }
                var padBytesLength = Math.ceil(bytesToRead / Constants.blockLength) * Constants.blockLength - bytesToRead;
                return {
                    data: data,
                    bytesRead: bytesToRead + padBytesLength
                };
            };
            var canReadData = function (header) {
                var _keyword;
                var i = 0;
                while (i < header.length) {
                    _keyword = header[i];
                    if (_keyword.key === "XTENSION" && (_keyword.value === "BINTABLE" || _keyword.value === "A3DTABLE")) {
                        return true;
                    }
                    i++;
                }
                return false;
            };
            datareaders.binaryTableDataReader = {
                readData: readData,
                canReadData: canReadData
            };
        })(datareaders = io.datareaders || (io.datareaders = {}));
    })(io = slimfits.io || (slimfits.io = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var io;
    (function (io) {
        var datareaders;
        (function (datareaders) {
            var arrayFor = function (elementType, buffer) {
                switch (elementType) {
                    case "Uint8":
                        return new Uint8Array(buffer);
                    case "Int8":
                        return new Int8Array(buffer);
                    case "Int16":
                        return new Int16Array(buffer);
                    case "Int32":
                        return new Int32Array(buffer);
                    case "Int64":
                        console.log('There is no TypedArray for ' + elementType);
                        break;
                    case "Float32":
                        return new Float32Array(buffer);
                    case "Float64":
                        return new Float64Array(buffer);
                    default:
                        console.log('There is no TypedArray for ' + elementType);
                        break;
                }
            };
            var readData = function (array, header) {
                var KeywordsManager = slimfits.utils.KeywordsManager;
                var Constants = slimfits.utils.Constants;
                var RegisteredTypes = slimfits.utils.RegisteredTypes;
                var EndianessConverter = slimfits.utils.EndianessConverter;
                var FitsMath = slimfits.utils.Math;
                var elementType = KeywordsManager.single(header, "BITPIX").value;
                var elementTypeSize = Math.abs(RegisteredTypes.valueForType(elementType)) / 8;
                var groupsLengths = [];
                var i = 0;
                var _keyword;
                var _key;
                var _value;
                while (i < header.length) {
                    _keyword = header[i];
                    _key = _keyword.key;
                    _value = _keyword.value;
                    if (_key.indexOf('NAXIS') === 0 && _key !== 'NAXIS' && _key !== 'NAXIS1' && _value !== 1) {
                        groupsLengths.push(_value);
                    }
                    i++;
                }
                var groupsCount = KeywordsManager.single(header, "GCOUNT").value;
                var paramsLength = KeywordsManager.single(header, "PCOUNT").value;
                var groupLength = 1;
                i = 0;
                while (i < groupsLengths.length) {
                    groupLength *= groupsLengths[i];
                    i++;
                }
                var paramsAndGroupLength = paramsLength + groupLength;
                var gpLength = groupsCount * paramsAndGroupLength;
                var bytesToRead = gpLength * elementTypeSize;
                var tmp = array.buffer;
                var buffer = tmp.slice(array.byteOffset, array.byteOffset + bytesToRead);
                var changeEndian = true;
                var rawBytes;
                if (changeEndian) {
                    rawBytes = new Uint8Array(buffer);
                }
                var data = [];
                i = 0;
                var offset = void 0;
                var length = void 0;
                while (i < groupsCount) {
                    offset = i * paramsAndGroupLength * elementTypeSize;
                    length = paramsLength * elementTypeSize;
                    if (changeEndian) {
                        EndianessConverter.convert(rawBytes, elementTypeSize, offset, length);
                    }
                    data.push(arrayFor(elementType, FitsMath.subbuffer(buffer, offset, length)));
                    offset += length;
                    length = groupLength * elementTypeSize;
                    if (changeEndian) {
                        EndianessConverter.convert(rawBytes, elementTypeSize, offset, length);
                    }
                    data.push(arrayFor(elementType, FitsMath.subbuffer(buffer, offset, length)));
                    i++;
                }
                var padBytesLength = Math.ceil(bytesToRead / Constants.blockLength) * Constants.blockLength - bytesToRead;
                return {
                    data: data,
                    bytesRead: bytesToRead + padBytesLength
                };
            };
            var canReadData = function (header) {
                var hasGroups = false;
                var naxis1Zero = false;
                var i = 0;
                var _keyword;
                while (i < header.length) {
                    _keyword = header[i];
                    if (_keyword.key === "GROUPS" && _keyword.value === true) {
                        hasGroups = true;
                    }
                    if (_keyword.key === "NAXIS1" && _keyword.value === 0) {
                        naxis1Zero = true;
                    }
                    if (hasGroups && naxis1Zero) {
                        return true;
                    }
                    i++;
                }
                return false;
            };
            datareaders.randomGroupsDataReader = {
                readData: readData,
                canReadData: canReadData
            };
        })(datareaders = io.datareaders || (io.datareaders = {}));
    })(io = slimfits.io || (slimfits.io = {}));
})(slimfits || (slimfits = {}));
var slimfits;
(function (slimfits) {
    var io;
    (function (io) {
        var datareaders;
        (function (datareaders) {
            var readDataWithoutScale = function (array, dataType, dataLengths) {
                var KeywordsManager = slimfits.utils.KeywordsManager;
                var Constants = slimfits.utils.Constants;
                var RegisteredTypes = slimfits.utils.RegisteredTypes;
                var EndianessConverter = slimfits.utils.EndianessConverter;
                var dataTypeLength = Math.abs(RegisteredTypes.valueForType(dataType)) / 8;
                var length = dataLengths.reduce(function (a, b) {
                    return a * b;
                }, 1);
                var bytesToRead = length * dataTypeLength;
                var changeEndian = true;
                var tmp = array.buffer;
                var buffer = tmp.slice(array.byteOffset, array.byteOffset + bytesToRead);
                var dataUnit;
                var rawBytes;
                var actualType = dataType;
                if (changeEndian) {
                    rawBytes = new Uint8Array(buffer);
                }
                switch (dataType) {
                    case "Uint8":
                        dataUnit = new Uint8Array(buffer);
                        break;
                    case "Int16":
                        dataUnit = new Int16Array(buffer);
                        if (changeEndian) {
                            EndianessConverter.convert(rawBytes, 2);
                        }
                        break;
                    case "Int32":
                        dataUnit = new Int32Array(buffer);
                        if (changeEndian) {
                            EndianessConverter.convert(rawBytes, 4);
                        }
                        break;
                    case "Float32":
                        dataUnit = new Float32Array(buffer);
                        if (changeEndian) {
                            EndianessConverter.convert(rawBytes, 4);
                        }
                        break;
                    case "Float64":
                        dataUnit = new Float64Array(buffer);
                        if (changeEndian) {
                            EndianessConverter.convert(rawBytes, 8);
                        }
                        break;
                    default:
                        console.log("Type " + dataType + " unrecognized");
                }
                var padBytesLength = Math.ceil(bytesToRead / Constants.blockLength) * Constants.blockLength - bytesToRead;
                return {
                    data: [dataUnit],
                    bytesRead: bytesToRead + padBytesLength,
                    actualType: actualType
                };
            };
            var readDataWithScale = function (array, dataType, bscale, bzero, dataLengths) {
                var KeywordsManager = slimfits.utils.KeywordsManager;
                var Constants = slimfits.utils.Constants;
                var RegisteredTypes = slimfits.utils.RegisteredTypes;
                var EndianessConverter = slimfits.utils.EndianessConverter;
                var dataTypeLength = Math.abs(RegisteredTypes.valueForType(dataType)) / 8;
                var length = dataLengths.reduce(function (a, b) {
                    return a * b;
                }, 1);
                var bytesToRead = length * dataTypeLength;
                var changeEndian = true;
                var tmp = array.buffer;
                var buffer = tmp.slice(array.byteOffset, array.byteOffset + bytesToRead);
                var dataUnit;
                var rawBytes;
                var actualType = dataType;
                if (changeEndian) {
                    rawBytes = new Uint8Array(buffer);
                }
                switch (dataType) {
                    case "Uint8":
                        dataUnit = new Uint8Array(buffer);
                        break;
                    case "Int16":
                        if (changeEndian) {
                            EndianessConverter.convert(rawBytes, Int16Array.BYTES_PER_ELEMENT);
                        }
                        // transformation
                        var switchToUint16 = false;
                        var dataView = new DataView(buffer);
                        var outBuffer = new ArrayBuffer(buffer.byteLength);
                        var outView = new DataView(outBuffer);
                        var dataLength = dataView.byteLength / Int16Array.BYTES_PER_ELEMENT;
                        for (var l = 0; l < dataLength; l++) {
                            var val = dataView.getInt16(l * Int16Array.BYTES_PER_ELEMENT, true) * bscale + bzero;
                            if (val > 32767) {
                                switchToUint16 = true;
                                break;
                            }
                            outView.setInt16(l * Int16Array.BYTES_PER_ELEMENT, val, true);
                        }
                        if (switchToUint16) {
                            actualType = 'Uint16';
                            var dataLength = dataView.byteLength / Uint16Array.BYTES_PER_ELEMENT;
                            for (var m = 0; m < dataLength; m++) {
                                var val = dataView.getInt16(m * Int16Array.BYTES_PER_ELEMENT, true) * bscale + bzero;
                                if (val < 0) {
                                    console.log('Error: value cannot be less than zero for \'Uint\' type');
                                }
                                outView.setUint16(m * Uint16Array.BYTES_PER_ELEMENT, val, true);
                            }
                        }
                        dataUnit = switchToUint16 ? new Uint16Array(outBuffer) : new Int16Array(outBuffer);
                        break;
                    case "Int32":
                        if (changeEndian) {
                            EndianessConverter.convert(rawBytes, Int32Array.BYTES_PER_ELEMENT);
                        }
                        // transformation
                        var switchToUint32 = false;
                        var dataView = new DataView(buffer);
                        var outBuffer = new ArrayBuffer(buffer.byteLength);
                        var outView = new DataView(outBuffer);
                        var dataLength = dataView.byteLength / Int32Array.BYTES_PER_ELEMENT;
                        for (var l = 0; l < dataLength; l++) {
                            var val = dataView.getInt32(l * Int32Array.BYTES_PER_ELEMENT, true) * bscale + bzero;
                            if (val > 2147483647) {
                                switchToUint32 = true;
                                break;
                            }
                            dataView.setInt32(l * Int32Array.BYTES_PER_ELEMENT, val, true);
                        }
                        if (switchToUint32) {
                            actualType = 'Uint32';
                            var dataLength = dataView.byteLength / Uint16Array.BYTES_PER_ELEMENT;
                            for (var m = 0; m < dataLength; m++) {
                                var val = dataView.getInt32(l * Int32Array.BYTES_PER_ELEMENT, true) * bscale + bzero;
                                if (val < 0) {
                                    console.log('Error: value cannot be less than zero for \'Uint\' type');
                                }
                                outView.setUint32(m * Uint32Array.BYTES_PER_ELEMENT, val, true);
                            }
                        }
                        dataUnit = switchToUint32 ? new Uint32Array(outBuffer) : new Int32Array(outBuffer);
                        // transformation
                        dataUnit = new Int32Array(buffer);
                        break;
                    case "Float32":
                        if (changeEndian) {
                            EndianessConverter.convert(rawBytes, Float32Array.BYTES_PER_ELEMENT);
                        }
                        // transformation
                        var dataView = new DataView(buffer);
                        var dataLength = dataView.byteLength / Float32Array.BYTES_PER_ELEMENT;
                        for (var l = 0; l < dataLength; l++) {
                            dataView.setFloat32(l * Float32Array.BYTES_PER_ELEMENT, dataView.getFloat32(l * Float32Array.BYTES_PER_ELEMENT, false) * bscale + bzero, false);
                        }
                        // transformation
                        dataUnit = new Float32Array(buffer);
                        break;
                    case "Float64":
                        if (changeEndian) {
                            EndianessConverter.convert(rawBytes, Float64Array.BYTES_PER_ELEMENT);
                        }
                        // transformation
                        var dataView = new DataView(buffer);
                        var dataLength = dataView.byteLength / Float64Array.BYTES_PER_ELEMENT;
                        for (var l = 0; l < dataLength; l++) {
                            dataView.setFloat64(l * Float64Array.BYTES_PER_ELEMENT, dataView.getFloat64(l * Float64Array.BYTES_PER_ELEMENT, false) * bscale + bzero, false);
                        }
                        // transformation
                        dataUnit = new Float64Array(buffer);
                        break;
                    default:
                        console.log("Type " + dataType + " unrecognized");
                }
                var padBytesLength = Math.ceil(bytesToRead / Constants.blockLength) * Constants.blockLength - bytesToRead;
                return {
                    data: [dataUnit],
                    bytesRead: bytesToRead + padBytesLength,
                    actualType: actualType
                };
            };
            var readData = function (array, header) {
                var KeywordsManager = slimfits.utils.KeywordsManager;
                var bscale;
                var bzero;
                var dataType = KeywordsManager.single(header, "BITPIX").value;
                var dataLengths = [];
                var i = 0;
                var _key;
                var containsZero = false;
                while (i < header.length) {
                    _key = header[i].key;
                    if (_key.indexOf("NAXIS", 0) === 0 && _key !== "NAXIS") {
                        dataLengths.push(header[i].value);
                        if (header[i].value === 0) {
                            containsZero = true;
                        }
                    }
                    i++;
                }
                var bscaleKv = KeywordsManager.single(header, "BSCALE");
                if ((bscaleKv === undefined) || (bscaleKv === null)) {
                    bscale = 1;
                }
                else {
                    bscale = bscaleKv.value;
                }
                var bzeroKv = KeywordsManager.single(header, "BZERO");
                if ((bzeroKv === undefined) || (bzeroKv === null)) {
                    bzero = 0;
                }
                else {
                    bzero = bzeroKv.value;
                }
                if (dataLengths.length > 0 && !containsZero) {
                    if (bscale !== 1 || bzero !== 0) {
                        return readDataWithScale(array, dataType, bscale, bzero, dataLengths);
                    }
                    else {
                        return readDataWithoutScale(array, dataType, dataLengths);
                    }
                }
                else {
                    return {
                        data: null,
                        bytesRead: 0
                    };
                }
            };
            var canReadData = function (header) {
                var i = 0;
                while (i < header.length) {
                    if (header[i].key === "SIMPLE" && header[i].value === true) {
                        return true;
                    }
                    if (header[i].key === "XTENSION" && header[i].value === "IMAGE") {
                        return true;
                    }
                    i++;
                }
                return false;
            };
            datareaders.simpleDataReader = {
                readData: readData,
                canReadData: canReadData
            };
        })(datareaders = io.datareaders || (io.datareaders = {}));
    })(io = slimfits.io || (slimfits.io = {}));
})(slimfits || (slimfits = {}));
