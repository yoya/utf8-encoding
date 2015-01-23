/// <reference path="types/webidl.d.ts" />
/// <reference path="types/obtain-unicode.d.ts" />
import ObtainUnicode = require("obtain-unicode");

type BufferSource = Uint8Array;

// https://encoding.spec.whatwg.org/#byte
type Byte = number;
type CodePoint = number;

// https://encoding.spec.whatwg.org/#concept-token
type Token = Byte | CodePoint;

// https://encoding.spec.whatwg.org/#end-of-stream
var EOS:Token = undefined;

// https://encoding.spec.whatwg.org/#concept-stream
type Stream = Token[];

// https://encoding.spec.whatwg.org/#error-mode
type ErrorMode = string; // TODO: more detail


/**
 * TextEncoder
 */
// [Constructor(optional DOMString utfLabel = "utf-8"),
//  Exposed=Window,Worker]
interface ITextEncoder {
  encoding:  DOMString; // readonly
  encode(input?: USVString /*=""*/): Uint8Array; // [NewObject]
};

/**
 * this encoder supports only UTF8
 */
// https://encoding.spec.whatwg.org/#textencoder
class TextEncoder implements ITextEncoder {
  private _encoding: DOMString; // only keep encoding name
  private encoder: Encoder;

  // https://encoding.spec.whatwg.org/#dom-textencoder-encoding
  get encoding(): DOMString {
    return this._encoding;
  }

  // https://encoding.spec.whatwg.org/#dom-textencoder
  constructor(utfLabel: DOMString = "utf-8") {
    // step 1 (not compat with spec)
    var encoding = utfLabel.toLowerCase();

    // step 2 (support only utf-8)
    if (utfLabel !== "utf-8" && utfLabel !== "utf8") {
      throw new RangeError("unsupported encoding, utf-8 only");
    }

    // step 3
    var enc = this;

    // step 4
    enc._encoding = encoding;

    // step 5 (support only utf-8)
    enc.encoder = new Utf8Encoder();

    return enc;
  }

  // https://encoding.spec.whatwg.org/#dom-textencoder-encode
  encode(inputString: USVString = ""): Uint8Array {
    // step 1
    var input: Stream = ObtainUnicode(inputString);

    // step 2
    var output: Stream = [];

    // step 3
    while(true) {
      // step 3-1
      var token: Token = input.shift(); // if undefined, means EOS

      // step 3-2
      var result = processing(token, this.encoder, input, output);

      // step 3-3
      if (result === "finished") {
        return new Uint8Array(output);
      }
    }
  }
}

// https://encoding.spec.whatwg.org/#concept-encoding-process
function processing(token: Token, encoderDecoderInstance: Coder, input: Stream, output: Stream, mode?: ErrorMode): any {
  // step 1
  if (mode === undefined) {
    if (encoderDecoderInstance instanceof Utf8Encoder) {
      mode = "replacement";
    } else {
      mode = "fatal";
    }
  }

  // step 2
  var result = encoderDecoderInstance.handler(input, token);

  // step 3
  if(result === "continue" || result === "finished") {
    return result;
  }

  // step 4
  else if(Array.isArray(result)) { // one or more tokens
    result.forEach((token: Token) => {
      output.push(token);
    });
  }

  // step 5
  else if(result) { // TODO: check result is Error
    switch(mode) {
    case "replacement":
      output.push(0xFFFD);
      break;
    case "HTML":
      throw new Error("unsupported because utf-8 only");
    case "fatal":
      return result;
    }
  }

  // step 6
  return "continue";
}

/**
 * TextDecoder
 */
class TextDecoderOptions {
  fatal:     boolean; // default false;
  ignoreBOM: boolean; // default false;
};

class TextDecodeOptions {
  stream:    boolean; // default false;
};

// [Constructor(optional DOMString label = "utf-8", optional TextDecoderOptions options),
//  Exposed=Window,Worker]
interface ITextDecoder {
  encoding:  DOMString;
  fatal:     boolean;
  ignoreBOM: boolean;
  decode(input?: BufferSource, options?: TextDecodeOptions): USVString;
};


/**
 * UTF-8 Encoder / Decoder Instance
 */
interface Coder{
  handler(input: Stream, token: Token): any; //TODO
}

interface Encoder extends Coder {
}

interface Decoder extends Coder {
}

// https://encoding.spec.whatwg.org/#utf-8-encoder
class Utf8Encoder implements Encoder {
  handler(input: Stream, codePoint: CodePoint): any {
    // step 1
    if(codePoint === EOS) {
      return 'finished';
    }

    // step 2
    if(0 <= codePoint && codePoint <= 0x007F) {
      return [codePoint]; // as byte
    }

    // step 3
    var count: number, offset: number;
    if(0x0080 <= codePoint && codePoint <= 0x07FF) {
      count = 1;
      offset = 0xC0;
    }
    else if(0x0800 <= codePoint && codePoint <= 0xFFFF) {
      count = 2;
      offset = 0xE0;
    }
    else if(0x10000 <= codePoint && codePoint <= 0x10FFFF) {
      count = 3;
      offset = 0xF0;
    }

    // step 4
    var bytes = [(codePoint >> (6*count)) + offset];

    // step 5
    while(count > 0) {
      // step 5-1
      var temp = codePoint >> (6*(count-1));
      // step 5-2
      bytes.push(0x80 | (temp & 0x3F));
      // step 5-3
      count = count - 1;
    }

    // step 6
    return bytes;
  }
}

this.TextEncoder = TextEncoder;
