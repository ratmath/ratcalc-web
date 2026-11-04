// ../../packages/core/src/base-system.js
class BaseSystem {
  #base;
  #radix;
  #digitOffset;
  #characters;
  #charMap;
  #name;
  #allowReserved;
  static #prefixMap = new Map;
  static RESERVED_SYMBOLS = new Set([
    "+",
    "-",
    "*",
    "/",
    "^",
    "!",
    "(",
    ")",
    "[",
    "]",
    ":",
    ".",
    "#",
    "~"
  ]);
  constructor(characters, name, options = {}) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("Base system options must be an object");
    }
    if (options.allowReserved !== undefined && typeof options.allowReserved !== "boolean") {
      throw new TypeError("allowReserved must be a boolean");
    }
    if (typeof characters === "string") {
      this.#characters = [...characters];
    } else if (Array.isArray(characters)) {
      this.#characters = [...characters];
    } else {
      throw new Error("Characters must be a string or array of strings");
    }
    if (this.#characters.length < 2) {
      throw new Error("Base system must have at least 2 characters");
    }
    if (this.#characters.some((character) => typeof character !== "string" || [...character].length !== 1)) {
      throw new Error("Each base system character must be a single Unicode character");
    }
    this.#base = this.#characters.length;
    this.#radix = options.radix ?? this.#base;
    this.#digitOffset = options.digitOffset ?? 0;
    this.#allowReserved = options.allowReserved === true;
    this.#charMap = this.#createCharacterMap();
    this.#name = name || `Base ${this.#base}`;
    this.#validateBase();
    this.#checkForConflicts();
  }
  get base() {
    return this.#base;
  }
  get radix() {
    return this.#radix;
  }
  get digitOffset() {
    return this.#digitOffset;
  }
  get supportsPositionalFractions() {
    return this.#radix === this.#base && this.#digitOffset === 0;
  }
  get requiresQuoting() {
    return this.#characters.some((character) => BaseSystem.RESERVED_SYMBOLS.has(character));
  }
  get allowsReservedDigits() {
    return this.#allowReserved;
  }
  get characters() {
    return [...this.#characters];
  }
  get charMap() {
    return new Map(this.#charMap);
  }
  getChar(value) {
    const i = Number(value);
    if (!Number.isSafeInteger(i) || i < this.#digitOffset || i >= this.#digitOffset + this.#characters.length) {
      throw new Error(`Value ${value} must be an in-range integer for base ${this.#base}`);
    }
    return this.#characters[i - this.#digitOffset];
  }
  get name() {
    return this.#name;
  }
  #createCharacterMap() {
    const map = new Map;
    for (let i = 0;i < this.#characters.length; i++) {
      map.set(this.#characters[i], i + this.#digitOffset);
    }
    return map;
  }
  #validateBase() {
    if (!Number.isSafeInteger(this.#radix) || Math.abs(this.#radix) < 2) {
      throw new Error("Radix must be a safe integer with absolute value at least 2");
    }
    if (Math.abs(this.#radix) !== this.#characters.length) {
      throw new Error(`Radix ${this.#radix} does not match character set length ${this.#characters.length}`);
    }
    if (!Number.isSafeInteger(this.#digitOffset))
      throw new Error("Digit offset must be a safe integer");
    const uniqueChars = new Set(this.#characters);
    if (uniqueChars.size !== this.#characters.length) {
      throw new Error("Character set contains duplicate characters");
    }
    this.#validateCharacterOrdering();
    if (this.#base > 1000) {
      console.warn(`Very large base system (${this.#base}). This may impact performance.`);
    }
  }
  #validateCharacterOrdering() {
    if (this.#name === "Roman Numerals" || this.#characters.length < 10) {
      return;
    }
    const ranges = [
      { start: "0", end: "9", name: "digits" },
      { start: "a", end: "z", name: "lowercase letters" },
      { start: "A", end: "Z", name: "uppercase letters" }
    ];
    for (const range of ranges) {
      const startCode = range.start.charCodeAt(0);
      const endCode = range.end.charCodeAt(0);
      let rangeChars = [];
      for (let i = 0;i < this.#characters.length; i++) {
        const char = this.#characters[i];
        const code = char.charCodeAt(0);
        if (code >= startCode && code <= endCode) {
          rangeChars.push(char);
        }
      }
      if (rangeChars.length >= 5 && rangeChars.length > (endCode - startCode) / 3) {
        for (let i = 1;i < rangeChars.length; i++) {
          const prevCode = rangeChars[i - 1].charCodeAt(0);
          const currCode = rangeChars[i].charCodeAt(0);
          if (currCode !== prevCode + 1) {
            console.warn(`Non-contiguous ${range.name} range detected in base system`);
            break;
          }
        }
      }
    }
  }
  #checkForConflicts() {
    if (this.#allowReserved)
      return;
    const conflicts = [];
    for (const char of this.#characters) {
      if (BaseSystem.RESERVED_SYMBOLS.has(char)) {
        conflicts.push(char);
      }
    }
    if (conflicts.length > 0) {
      throw new Error(`Base system characters conflict with parser symbols: ${conflicts.join(", ")}. ` + `Reserved symbols are: ${Array.from(BaseSystem.RESERVED_SYMBOLS).join(", ")}`);
    }
  }
  toDecimal(str) {
    if (typeof str !== "string" || str.length === 0) {
      throw new Error("Input must be a non-empty string");
    }
    let negative = false;
    if (str.startsWith("-")) {
      negative = true;
      str = str.slice(1);
    }
    if (str.length === 0) {
      throw new Error("A minus sign must be followed by at least one digit");
    }
    let result = 0n;
    const baseBigInt = BigInt(this.#radix);
    for (const char of str) {
      if (!this.#charMap.has(char)) {
        throw new Error(`Invalid character '${char}' for ${this.#name} (base ${this.#base})`);
      }
      const digitValue = BigInt(this.#charMap.get(char));
      result = result * baseBigInt + digitValue;
    }
    return negative ? -result : result;
  }
  fromDecimal(value) {
    if (typeof value !== "bigint") {
      throw new Error("Value must be a BigInt");
    }
    if (value === 0n) {
      const zero = this.#characters.find((character) => this.#charMap.get(character) === 0);
      if (zero !== undefined)
        return zero;
      throw new Error(`${this.#name} has no representation for zero`);
    }
    if (value < 0n && this.#radix > 0 && this.#digitOffset === 0) {
      return `-${this.fromDecimal(-value)}`;
    }
    if (value < 0n && this.#radix > 0 && this.#digitOffset > 0) {
      return `-${this.fromDecimal(-value)}`;
    }
    const radix = BigInt(this.#radix);
    const modulus = BigInt(Math.abs(this.#radix));
    const digitValues = this.#characters.map((character) => BigInt(this.#charMap.get(character)));
    const digits = [];
    let steps = 0;
    while (value !== 0n) {
      const residue = (value % modulus + modulus) % modulus;
      const index = digitValues.findIndex((digit) => (digit % modulus + modulus) % modulus === residue);
      if (index < 0)
        throw new Error(`No digit in ${this.#name} can encode residue ${residue}`);
      const digit = digitValues[index];
      digits.unshift(this.#characters[index]);
      value = (value - digit) / radix;
      if (++steps > 1e5)
        throw new Error(`${this.#name} conversion did not converge`);
    }
    return digits.join("");
  }
  isValidString(str) {
    if (typeof str !== "string") {
      return false;
    }
    if (str.startsWith("-")) {
      str = str.slice(1);
    }
    if (str.length === 0) {
      return false;
    }
    for (const char of str) {
      if (!this.#charMap.has(char)) {
        return false;
      }
    }
    return true;
  }
  getMaxDigit() {
    return this.#characters[this.#characters.length - 1];
  }
  getMinDigit() {
    return this.#characters[0];
  }
  toString() {
    const charPreview = this.#characters.length <= 20 ? this.#characters.join("") : this.#characters.slice(0, 10).join("") + "..." + this.#characters.slice(-10).join("");
    return `${this.#name} (${charPreview})`;
  }
  equals(other) {
    if (!(other instanceof BaseSystem)) {
      return false;
    }
    if (this.#base !== other.#base || this.#radix !== other.#radix || this.#digitOffset !== other.#digitOffset) {
      return false;
    }
    for (let i = 0;i < this.#characters.length; i++) {
      if (this.#characters[i] !== other.#characters[i]) {
        return false;
      }
    }
    return true;
  }
  static fromBase(base, name) {
    if (!Number.isInteger(base) || base < 2) {
      throw new Error("Base must be an integer >= 2");
    }
    const characters = [];
    if (base <= 62) {
      for (let i = 0;i < Math.min(base, 10); i++) {
        characters.push(String.fromCharCode(48 + i));
      }
      if (base > 10) {
        for (let i = 0;i < Math.min(base - 10, 26); i++) {
          characters.push(String.fromCharCode(97 + i));
        }
      }
      if (base > 36) {
        for (let i = 0;i < base - 36; i++) {
          characters.push(String.fromCharCode(65 + i));
        }
      }
    } else {
      throw new Error("BaseSystem.fromBase() only supports bases up to 62. Use constructor with custom character sequence for larger bases.");
    }
    return new BaseSystem(characters, name || `Base ${base}`);
  }
  static createPattern(pattern, size, name) {
    const characters = [];
    switch (pattern.toLowerCase()) {
      case "alphanumeric":
        if (size > 62) {
          throw new Error(`Alphanumeric pattern only supports up to base 62, got ${size}`);
        }
        return BaseSystem.fromBase(size, name);
      case "digits-only":
        if (size > 10) {
          throw new Error(`Digits-only pattern only supports up to base 10, got ${size}`);
        }
        for (let i = 0;i < size; i++)
          characters.push(String.fromCharCode(48 + i));
        return new BaseSystem(characters, name || `Base ${size} (digits only)`);
      case "letters-only":
        if (size > 52) {
          throw new Error(`Letters-only pattern only supports up to base 52, got ${size}`);
        }
        for (let i = 0;i < Math.min(size, 26); i++) {
          characters.push(String.fromCharCode(97 + i));
        }
        if (size > 26) {
          for (let i = 0;i < size - 26; i++) {
            characters.push(String.fromCharCode(65 + i));
          }
        }
        return new BaseSystem(characters, name || (size <= 26 ? `Base ${size} (lowercase letters)` : `Base ${size} (mixed case letters)`));
      case "uppercase-only":
        if (size > 26) {
          throw new Error(`Uppercase-only pattern only supports up to base 26, got ${size}`);
        }
        for (let i = 0;i < size; i++) {
          characters.push(String.fromCharCode(65 + i));
        }
        return new BaseSystem(characters, name || `Base ${size} (uppercase letters)`);
      default:
        throw new Error(`Unknown pattern: ${pattern}. Supported patterns: alphanumeric, digits-only, letters-only, uppercase-only`);
    }
  }
  static registerPrefix(prefix, baseSystem) {
    if (typeof prefix !== "string" || prefix.length !== 1) {
      throw new Error("Prefix must be a single character");
    }
    if (!(baseSystem instanceof BaseSystem)) {
      throw new Error("Must provide a valid BaseSystem");
    }
    if (!/^[a-zA-Z]$/.test(prefix)) {
      throw new Error("Prefix must be a letter");
    }
    BaseSystem.#prefixMap.set(prefix, baseSystem);
  }
  static unregisterPrefix(prefix) {
    BaseSystem.#prefixMap.delete(prefix);
  }
  static hasExactPrefix(prefix) {
    return BaseSystem.#prefixMap.has(prefix);
  }
  static getSystemForPrefix(prefix) {
    if (prefix === "D")
      return null;
    if (BaseSystem.#prefixMap.has(prefix)) {
      return BaseSystem.#prefixMap.get(prefix);
    }
    const lower = prefix.toLowerCase();
    if (BaseSystem.#prefixMap.has(lower)) {
      if (lower === "d" && prefix !== "d")
        return;
      return BaseSystem.#prefixMap.get(lower);
    }
    return;
  }
  static getPrefixForSystem(baseSystem) {
    for (const [prefix, system] of BaseSystem.#prefixMap.entries()) {
      if (system.equals(baseSystem)) {
        return prefix;
      }
    }
    return;
  }
  withCaseSensitivity(caseSensitive) {
    if (caseSensitive === true) {
      return this;
    }
    if (caseSensitive === false) {
      const lowerChars = this.#characters.map((char) => char.toLowerCase());
      const uniqueLowerChars = [...new Set(lowerChars)];
      const collapsed = uniqueLowerChars.length !== lowerChars.length;
      if (collapsed) {
        console.warn("Case-insensitive conversion resulted in duplicate characters");
      }
      return new BaseSystem(uniqueLowerChars.join(""), `${this.#name} (case-insensitive)`, collapsed ? { allowReserved: this.#allowReserved } : {
        radix: this.#radix,
        digitOffset: this.#digitOffset,
        allowReserved: this.#allowReserved
      });
    }
    throw new Error("caseSensitive must be a boolean value");
  }
  toJSON() {
    return {
      $ratmath: "BaseSystem",
      characters: this.#characters,
      name: this.#name,
      radix: this.#radix,
      digitOffset: this.#digitOffset,
      allowReserved: this.#allowReserved
    };
  }
}
BaseSystem.BINARY = new BaseSystem(["0", "1"], "Binary");
BaseSystem.TERNARY = new BaseSystem(["0", "1", "2"], "Ternary");
BaseSystem.QUATERNARY = new BaseSystem(["0", "1", "2", "3"], "Quaternary");
BaseSystem.QUINARY = new BaseSystem(["0", "1", "2", "3", "4"], "Quinary (Base 5)");
BaseSystem.SEPTENARY = new BaseSystem(["0", "1", "2", "3", "4", "5", "6"], "Septenary (Base 7)");
BaseSystem.OCTAL = new BaseSystem(["0", "1", "2", "3", "4", "5", "6", "7"], "Octal");
BaseSystem.DECIMAL = new BaseSystem(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], "Decimal");
BaseSystem.DUODECIMAL = new BaseSystem(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b"], "Duodecimal (Clock/Base 12)");
BaseSystem.HEXADECIMAL = new BaseSystem(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"], "Hexadecimal");
BaseSystem.VIGESIMAL = new BaseSystem("0123456789abcdefghij".split(""), "Vigesimal (Base 20)");
BaseSystem.BASE36 = new BaseSystem("0123456789abcdefghijklmnopqrstuvwxyz".split(""), "Base 36 (URL)");
BaseSystem.BASE62 = new BaseSystem("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "Base 62");
BaseSystem.BASE64 = new BaseSystem("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@&".split(""), "Base 64");
BaseSystem.BASE60 = new BaseSystem("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWX".split(""), "Base 60 (Mesopotamia)");
BaseSystem.ROMAN = new BaseSystem(["I", "V", "X", "L", "C", "D", "M"], "Roman Numerals");
BaseSystem.registerPrefix("b", BaseSystem.BINARY);
BaseSystem.registerPrefix("t", BaseSystem.TERNARY);
BaseSystem.registerPrefix("q", BaseSystem.QUATERNARY);
BaseSystem.registerPrefix("f", BaseSystem.QUINARY);
BaseSystem.registerPrefix("s", BaseSystem.SEPTENARY);
BaseSystem.registerPrefix("o", BaseSystem.OCTAL);
BaseSystem.registerPrefix("d", BaseSystem.DUODECIMAL);
BaseSystem.registerPrefix("x", BaseSystem.HEXADECIMAL);
BaseSystem.registerPrefix("v", BaseSystem.VIGESIMAL);
BaseSystem.registerPrefix("u", BaseSystem.BASE36);
BaseSystem.registerPrefix("m", BaseSystem.BASE60);
BaseSystem.registerPrefix("y", BaseSystem.BASE64);

// ../../packages/core/src/rational-literal.js
var DIGITS = String.raw`\d(?:_?\d)*`;
var MAX_EXPANDED_DIGITS = 1e5;
function inputString(input, label = "number") {
  if (typeof input !== "string") {
    throw new TypeError(`${label} must be a string`);
  }
  const value = input.trim();
  if (value.length === 0) {
    throw new Error(`${label} cannot be empty`);
  }
  return value;
}
function cleanDigits(value, { signed = false } = {}) {
  const pattern = signed ? new RegExp(`^[+-]?${DIGITS}$`) : new RegExp(`^${DIGITS}$`);
  if (!pattern.test(value)) {
    throw new Error(`Invalid decimal digits: ${value}`);
  }
  return value.replaceAll("_", "");
}
function validateUnderscores(value) {
  for (let index = 0;index < value.length; index++) {
    if (value[index] !== "_")
      continue;
    if (!/\d/.test(value[index - 1] ?? "") || !/\d/.test(value[index + 1] ?? "")) {
      throw new Error("Underscore separators must be between decimal digits");
    }
  }
}
function expandDigitRuns(value) {
  let expandedLength = 0;
  const expanded = value.replace(/\{(\d+)~(\d+)\}/g, (_match, digits, countText) => {
    const count = Number(countText);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(`Invalid repeated-digit count: ${countText}`);
    }
    expandedLength += digits.length * count;
    if (expandedLength > MAX_EXPANDED_DIGITS) {
      throw new Error(`Expanded decimal exceeds ${MAX_EXPANDED_DIGITS} digits`);
    }
    return digits.repeat(count);
  });
  if (/[{}]/.test(expanded)) {
    throw new Error(`Invalid repeated-digit notation: ${value}`);
  }
  if (expanded.length > MAX_EXPANDED_DIGITS) {
    throw new Error(`Decimal exceeds ${MAX_EXPANDED_DIGITS} digits`);
  }
  return expanded;
}
function parseDecimalParts(input) {
  let value = inputString(input, "decimal");
  validateUnderscores(value);
  let sign = 1n;
  if (value.startsWith("+") || value.startsWith("-")) {
    sign = value[0] === "-" ? -1n : 1n;
    value = value.slice(1);
  }
  const hashParts = value.split("#");
  if (hashParts.length > 2) {
    throw new Error("A repeating decimal can contain only one '#'");
  }
  let prefix = expandDigitRuns(hashParts[0].replaceAll("_", ""));
  const repeating = hashParts.length === 2 ? expandDigitRuns(hashParts[1].replaceAll("_", "")) : null;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(prefix)) {
    throw new Error(`Invalid decimal format: ${input}`);
  }
  const dot = prefix.indexOf(".");
  const integerDigits = dot === -1 ? prefix : prefix.slice(0, dot) || "0";
  const fractionalDigits = dot === -1 ? "" : prefix.slice(dot + 1);
  const integer = BigInt(integerDigits);
  const fractional = fractionalDigits.length === 0 ? 0n : BigInt(fractionalDigits);
  const fractionalScale = 10n ** BigInt(fractionalDigits.length);
  let numerator = integer * fractionalScale + fractional;
  let denominator = fractionalScale;
  if (repeating !== null) {
    if (!/^\d+$/.test(repeating)) {
      throw new Error("The repeating part must contain one or more digits");
    }
    if (!/^0+$/.test(repeating)) {
      const repeatScale = 10n ** BigInt(repeating.length) - 1n;
      numerator = numerator * repeatScale + BigInt(repeating);
      denominator *= repeatScale;
    }
  }
  return [sign * numerator, denominator];
}
function parseRationalParts(input) {
  let value = inputString(input, "rational");
  if (value.startsWith("~")) {
    value = value.slice(1);
  }
  const continued = value.match(new RegExp(`^([+-]?${DIGITS})\\.~(${DIGITS}(?:~${DIGITS})*)$`));
  if (continued) {
    const first = BigInt(cleanDigits(continued[1], { signed: true }));
    const tail = continued[2].split("~").map((term) => BigInt(cleanDigits(term)));
    if (tail.length === 1 && tail[0] === 0n) {
      return [first, 1n];
    }
    return continuedFractionParts([first, ...tail]);
  }
  const mixed = value.match(new RegExp(`^([+-]?)(${DIGITS})\\.\\.(${DIGITS})\\/(${DIGITS})$`));
  if (mixed) {
    const sign = mixed[1] === "-" ? -1n : 1n;
    const whole = BigInt(cleanDigits(mixed[2]));
    const numerator = BigInt(cleanDigits(mixed[3]));
    const denominator = BigInt(cleanDigits(mixed[4]));
    if (denominator === 0n) {
      throw new Error("Denominator cannot be zero");
    }
    return [sign * (whole * denominator + numerator), denominator];
  }
  if (value.includes("..")) {
    throw new Error("Invalid mixed number format. Use 'a..b/c'");
  }
  const fraction = value.match(new RegExp(`^([+-]?${DIGITS})\\/(${DIGITS})$`));
  if (fraction) {
    const denominator = BigInt(cleanDigits(fraction[2]));
    if (denominator === 0n) {
      throw new Error("Denominator cannot be zero");
    }
    return [BigInt(cleanDigits(fraction[1], { signed: true })), denominator];
  }
  if (value.includes("#") || value.includes(".")) {
    return parseDecimalParts(value);
  }
  if (new RegExp(`^[+-]?${DIGITS}$`).test(value)) {
    return [BigInt(cleanDigits(value, { signed: true })), 1n];
  }
  throw new Error(`Invalid rational number: ${input}`);
}
function continuedFractionParts(terms) {
  for (const term of terms.slice(1)) {
    if (term <= 0n) {
      throw new Error(`Continued fraction terms must be positive: ${term}`);
    }
  }
  let [pPrev, p, qPrev, q] = [1n, terms[0], 0n, 1n];
  for (const a of terms.slice(1)) {
    [pPrev, p] = [p, a * p + pPrev];
    [qPrev, q] = [q, a * q + qPrev];
  }
  return [p, q];
}

// ../../packages/core/src/bigint.js
function toExactBigInt(value, label = "Value") {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`${label} must be a safe integer; use a string or bigint for exact values`);
    }
    return BigInt(value);
  }
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "string" && /^[+-]?\d+$/.test(value.trim())) {
    return BigInt(value.trim());
  }
  throw new TypeError(`${label} must be an integer number, string, or bigint`);
}

// ../../packages/core/src/reduced-arithmetic.js
function gcd(a, b) {
  if (a < 0n)
    a = -a;
  if (b < 0n)
    b = -b;
  while (b !== 0n)
    [a, b] = [b, a % b];
  return a;
}
function reducedSum(a, b, c, d) {
  if (d === 1n)
    return [a + c * b, b];
  if (b === 1n)
    return [a * d + c, d];
  if (b === d) {
    const n = a + c;
    const g = gcd(n, b);
    return n === 0n ? [0n, 1n] : [n / g, b / g];
  }
  const g = gcd(b, d);
  if (g === 1n)
    return [a * d + c * b, b * d];
  const bb = b / g;
  const n = a * (d / g) + c * bb;
  const h = gcd(n, g);
  return n === 0n ? [0n, 1n] : [n / h, bb * (d / h)];
}
function reducedProduct(a, b, c, d) {
  if (a === 0n || c === 0n)
    return [0n, 1n];
  const g = gcd(a, d);
  const h = gcd(c, b);
  return [a / g * (c / h), b / h * (d / g)];
}
function reducedQuotient(a, b, c, d) {
  if (a === 0n)
    return [0n, 1n];
  const g = gcd(a, c);
  const h = gcd(b, d);
  const n = a / g * (d / h);
  const den = b / h * (c / g);
  return den < 0n ? [-n, -den] : [n, den];
}

// ../../packages/core/src/rational.js
var POWERS_OF_5 = Object.freeze({
  16: 5n ** 16n,
  8: 5n ** 8n,
  4: 5n ** 4n,
  2: 5n ** 2n,
  1: 5n
});
var bitLength = function(int) {
  if (int === 0n)
    return 0;
  return int < 0n ? (-int).toString(2).length : int.toString(2).length;
};
var roundedQuotient = function(numerator, denominator, mode) {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n || mode === "toward-zero")
    return quotient;
  if (mode === "floor")
    return numerator < 0n ? quotient - 1n : quotient;
  if (mode === "ceil")
    return numerator > 0n ? quotient + 1n : quotient;
  const twiceRemainder = (remainder < 0n ? -remainder : remainder) * 2n;
  if (twiceRemainder < denominator)
    return quotient;
  const direction = numerator < 0n ? -1n : 1n;
  if (twiceRemainder > denominator || mode === "half-up") {
    return quotient + direction;
  }
  return quotient % 2n === 0n ? quotient : quotient + direction;
};
var continuedFractionOptions = function(options, defaultLimit) {
  if (options === undefined) {
    return { maxTerms: defaultLimit, long: false };
  }
  if (typeof options === "number") {
    return { maxTerms: options, long: false };
  }
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Continued-fraction options must be a number or an object");
  }
  const maxTerms = options.maxTerms ?? defaultLimit;
  const long = options.long ?? false;
  if (typeof long !== "boolean") {
    throw new TypeError("Continued-fraction long option must be a boolean");
  }
  return { maxTerms, long };
};
var convergentOptions = function(options, defaultLimit) {
  if (options === undefined) {
    return { maxCount: defaultLimit, long: false, intermediates: false };
  }
  if (typeof options === "number") {
    return { maxCount: options, long: false, intermediates: false };
  }
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Convergent options must be a number or an object");
  }
  const maxCount = options.maxCount ?? defaultLimit;
  const long = options.long ?? false;
  const intermediates = options.intermediates ?? false;
  if (typeof long !== "boolean") {
    throw new TypeError("Convergent long option must be a boolean");
  }
  if (typeof intermediates !== "boolean") {
    throw new TypeError("Convergent intermediates option must be a boolean");
  }
  return { maxCount, long, intermediates };
};
function exactParts(other) {
  if (typeof other?.value === "bigint" && other.denominator === undefined) {
    return [other.value, 1n];
  }
  return [other.numerator, other.denominator];
}

class Rational {
  #numerator;
  #denominator;
  #isNegative;
  #wholePart;
  #remainder;
  #initialSegment;
  #periodDigits;
  #periodLength;
  #isTerminating;
  #factorsOf2;
  #factorsOf5;
  #leadingZerosInPeriod;
  #initialSegmentLeadingZeros;
  #initialSegmentRest;
  #periodDigitsRest;
  #maxPeriodDigitsComputed;
  #maxPeriodCheckComputed;
  static MAX_PERIOD_DIGITS = 30;
  static MAX_PERIOD_CHECK = 1e7;
  static DEFAULT_DECIMAL_DIGITS = 20;
  static DEFAULT_SCIENTIFIC_PRECISION = 11;
  static DEFAULT_BASE_LIMIT = 1000;
  static DEFAULT_PERIOD_MODULO_LIMIT = 1e6;
  static zero = new Rational(0, 1);
  static one = new Rational(1, 1);
  constructor(numerator, denominator = 1n) {
    if (numerator instanceof Rational) {
      this.#numerator = numerator.numerator;
      this.#denominator = numerator.denominator;
      this.#isNegative = this.#numerator < 0n;
      return;
    }
    if (numerator && typeof numerator === "object" && numerator.constructor.name === "Integer") {
      this.#numerator = numerator.value;
      if (denominator && typeof denominator === "object" && denominator.constructor.name === "Integer") {
        this.#denominator = denominator.value;
      } else if (denominator !== undefined) {
        this.#denominator = toExactBigInt(denominator, "Rational denominator");
      } else {
        this.#denominator = 1n;
      }
      if (this.#denominator === 0n) {
        throw new Error("Denominator cannot be zero");
      }
      this.#normalize();
      this.#isNegative = this.#numerator < 0n;
      return;
    }
    if (typeof numerator === "string") {
      const [parsedNumerator, parsedDenominator] = parseRationalParts(numerator);
      let divisor = 1n;
      if (arguments.length > 1) {
        divisor = denominator && typeof denominator === "object" && denominator.constructor.name === "Integer" ? denominator.value : toExactBigInt(denominator, "Rational denominator");
      }
      this.#numerator = parsedNumerator;
      this.#denominator = parsedDenominator * divisor;
    } else {
      this.#numerator = toExactBigInt(numerator, "Rational numerator");
      this.#denominator = toExactBigInt(denominator, "Rational denominator");
    }
    if (this.#denominator === 0n) {
      throw new Error("Denominator cannot be zero");
    }
    this.#normalize();
    this.#isNegative = this.#numerator < 0n;
  }
  static #fromCanonical(numerator, denominator) {
    const result = new Rational(0n, 1n);
    result.#numerator = numerator;
    result.#denominator = denominator;
    result.#isNegative = numerator < 0n;
    return result;
  }
  static #canonicalParts(other) {
    if (other == null || typeof other !== "object")
      return null;
    const prototype = Object.getPrototypeOf(other);
    if (prototype === Rational.prototype) {
      return Object.hasOwn(other, "numerator") || Object.hasOwn(other, "denominator") ? null : [other.#numerator, other.#denominator];
    }
    if (prototype?.constructor?.name === "Integer" && !Object.hasOwn(other, "value")) {
      const value = other.value;
      return typeof value === "bigint" ? [value, 1n] : null;
    }
    return null;
  }
  #normalize() {
    if (this.#denominator < 0n) {
      this.#numerator = -this.#numerator;
      this.#denominator = -this.#denominator;
    }
    if (this.#numerator === 0n) {
      this.#denominator = 1n;
      return;
    }
    const gcd = this.#gcd(this.#numerator < 0n ? -this.#numerator : this.#numerator, this.#denominator);
    this.#numerator = this.#numerator / gcd;
    this.#denominator = this.#denominator / gcd;
  }
  #gcd(a, b) {
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
  get numerator() {
    return this.#numerator;
  }
  get denominator() {
    return this.#denominator;
  }
  add(other) {
    const parts = Rational.#canonicalParts(other);
    if (parts) {
      return Rational.#fromCanonical(...reducedSum(this.#numerator, this.#denominator, parts[0], parts[1]));
    }
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("add", this);
    }
    if (other.constructor.name === "Integer") {
      const otherAsRational = new Rational(other.value, 1n);
      return this.add(otherAsRational);
    } else if (other instanceof Rational) {
      const a = this.#numerator;
      const b = this.#denominator;
      const c = other.numerator;
      const d = other.denominator;
      const numerator = a * d + b * c;
      const denominator = b * d;
      return new Rational(numerator, denominator);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const thisAsInterval = { low: this, high: this };
      const IntervalClass = other.constructor;
      const newThisAsInterval = new IntervalClass(this, this);
      return newThisAsInterval.add(other);
    } else {
      throw new Error(`Cannot add ${other.constructor.name} to Rational`);
    }
  }
  subtract(other) {
    const parts = Rational.#canonicalParts(other);
    if (parts) {
      return Rational.#fromCanonical(...reducedSum(this.#numerator, this.#denominator, -parts[0], parts[1]));
    }
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("subtract", this);
    }
    if (other.constructor.name === "Integer") {
      const otherAsRational = new Rational(other.value, 1n);
      return this.subtract(otherAsRational);
    } else if (other instanceof Rational) {
      const a = this.#numerator;
      const b = this.#denominator;
      const c = other.numerator;
      const d = other.denominator;
      const numerator = a * d - b * c;
      const denominator = b * d;
      return new Rational(numerator, denominator);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const IntervalClass = other.constructor;
      const newThisAsInterval = new IntervalClass(this, this);
      return newThisAsInterval.subtract(other);
    } else {
      throw new Error(`Cannot subtract ${other.constructor.name} from Rational`);
    }
  }
  multiply(other) {
    const parts = Rational.#canonicalParts(other);
    if (parts) {
      return Rational.#fromCanonical(...reducedProduct(this.#numerator, this.#denominator, parts[0], parts[1]));
    }
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("multiply", this);
    }
    if (other.constructor.name === "Integer") {
      const otherAsRational = new Rational(other.value, 1n);
      return this.multiply(otherAsRational);
    } else if (other instanceof Rational) {
      const a = this.#numerator;
      const b = this.#denominator;
      const c = other.numerator;
      const d = other.denominator;
      const numerator = a * c;
      const denominator = b * d;
      return new Rational(numerator, denominator);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const IntervalClass = other.constructor;
      const newThisAsInterval = new IntervalClass(this, this);
      return newThisAsInterval.multiply(other);
    } else {
      throw new Error(`Cannot multiply Rational by ${other.constructor.name}`);
    }
  }
  divide(other) {
    const parts = Rational.#canonicalParts(other);
    if (parts) {
      if (parts[0] === 0n)
        throw new Error("Division by zero");
      return Rational.#fromCanonical(...reducedQuotient(this.#numerator, this.#denominator, parts[0], parts[1]));
    }
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("divide", this);
    }
    if (other.constructor.name === "Integer") {
      if (other.value === 0n) {
        throw new Error("Division by zero");
      }
      const otherAsRational = new Rational(other.value, 1n);
      return this.divide(otherAsRational);
    } else if (other instanceof Rational) {
      if (other.numerator === 0n) {
        throw new Error("Division by zero");
      }
      const a = this.#numerator;
      const b = this.#denominator;
      const c = other.numerator;
      const d = other.denominator;
      const numerator = a * d;
      const denominator = b * c;
      return new Rational(numerator, denominator);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const IntervalClass = other.constructor;
      const newThisAsInterval = new IntervalClass(this, this);
      return newThisAsInterval.divide(other);
    } else {
      throw new Error(`Cannot divide Rational by ${other.constructor.name}`);
    }
  }
  possibleRelationsTo(other) {
    if (other?.isCertifiedApproximation === true)
      other = other.enclosure;
    if (other?.constructor?.name === "Integer")
      other = new Rational(other.value, 1n);
    if (other instanceof Rational)
      return this.lessThan(other) ? 1 : this.greaterThan(other) ? 4 : 2;
    if (other?.low && other?.high) {
      let mask = 0;
      if (this.lessThan(other.high))
        mask |= 1;
      if (other.low.lessThanOrEqual(this) && this.lessThanOrEqual(other.high))
        mask |= 2;
      if (this.greaterThan(other.low))
        mask |= 4;
      return mask;
    }
    throw new TypeError("Possible relations require a Core numeric value");
  }
  negate() {
    return new Rational(-this.#numerator, this.#denominator);
  }
  reciprocal() {
    if (this.#numerator === 0n) {
      throw new Error("Cannot take reciprocal of zero");
    }
    return new Rational(this.#denominator, this.#numerator);
  }
  pow(exponent) {
    const n = toExactBigInt(exponent, "Exponent");
    if (n === 0n) {
      if (this.#numerator === 0n) {
        throw new Error("Zero cannot be raised to the power of zero");
      }
      return new Rational(1);
    }
    if (this.#numerator === 0n && n < 0n) {
      throw new Error("Zero cannot be raised to a negative power");
    }
    if (n < 0n) {
      const reciprocal = this.reciprocal();
      return reciprocal.pow(-n);
    }
    return new Rational(this.#numerator ** n, this.#denominator ** n);
  }
  equals(other) {
    const [numerator, denominator] = exactParts(other);
    return this.#numerator === numerator && this.#denominator === denominator;
  }
  compareTo(other) {
    const [numerator, denominator] = exactParts(other);
    const crossProduct1 = this.#numerator * denominator;
    const crossProduct2 = this.#denominator * numerator;
    if (crossProduct1 < crossProduct2)
      return -1;
    if (crossProduct1 > crossProduct2)
      return 1;
    return 0;
  }
  lessThan(other) {
    return this.compareTo(other) < 0;
  }
  lessThanOrEqual(other) {
    return this.compareTo(other) <= 0;
  }
  greaterThan(other) {
    return this.compareTo(other) > 0;
  }
  greaterThanOrEqual(other) {
    return this.compareTo(other) >= 0;
  }
  abs() {
    return this.#numerator < 0n ? this.negate() : new Rational(this.#numerator, this.#denominator);
  }
  floor() {
    return roundedQuotient(this.#numerator, this.#denominator, "floor");
  }
  ceil() {
    return roundedQuotient(this.#numerator, this.#denominator, "ceil");
  }
  trunc() {
    return roundedQuotient(this.#numerator, this.#denominator, "toward-zero");
  }
  round(mode = "half-even") {
    if (!new Set(["half-even", "half-up", "toward-zero", "floor", "ceil"]).has(mode)) {
      throw new TypeError("Unknown rounding mode");
    }
    return roundedQuotient(this.#numerator, this.#denominator, mode);
  }
  roundTo(places, mode = "half-even") {
    if (!Number.isSafeInteger(places)) {
      throw new RangeError("Decimal places must be a safe integer");
    }
    if (!new Set(["half-even", "half-up", "toward-zero", "floor", "ceil"]).has(mode)) {
      throw new TypeError("Unknown rounding mode");
    }
    const scale = 10n ** BigInt(Math.abs(places));
    if (places >= 0) {
      return new Rational(roundedQuotient(this.#numerator * scale, this.#denominator, mode), scale);
    }
    return new Rational(roundedQuotient(this.#numerator, this.#denominator * scale, mode) * scale);
  }
  toJSON() {
    return {
      $ratmath: "Rational",
      numerator: this.#numerator.toString(),
      denominator: this.#denominator.toString()
    };
  }
  toString(base, options) {
    if (base === undefined) {
      if (this.#denominator === 1n) {
        return this.#numerator.toString();
      }
      return `${this.#numerator}/${this.#denominator}`;
    }
    let baseSystem;
    if (base instanceof BaseSystem) {
      baseSystem = base;
    } else if (typeof base === "number") {
      baseSystem = BaseSystem.fromBase(base);
    } else {
      return this.toString();
    }
    return this.toRepeatingBase(baseSystem, options);
  }
  toRepeatingBase(baseSystem, options) {
    return this.toRepeatingBaseWithPeriod(baseSystem, options).baseStr;
  }
  toRepeatingBaseWithPeriod(baseSystem, options = {}) {
    if (!(baseSystem instanceof BaseSystem)) {
      throw new Error("Argument must be a BaseSystem");
    }
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("Base-expansion options must be an object");
    }
    const {
      useRepeatNotation = true,
      limit = Rational.DEFAULT_BASE_LIMIT
    } = options;
    if (typeof useRepeatNotation !== "boolean") {
      throw new TypeError("Base-expansion useRepeatNotation option must be a boolean");
    }
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new RangeError("Base-expansion limit must be a positive safe integer");
    }
    if (!baseSystem.supportsPositionalFractions) {
      if (this.#denominator === 1n) {
        return {
          baseStr: baseSystem.fromDecimal(this.#numerator),
          period: 0,
          limitHit: false
        };
      }
      throw new RangeError("Fractional radix expansion requires a conventional positional BaseSystem; use toBase() for an exact fraction");
    }
    if (this.#numerator < 0n) {
      const result = this.negate().toRepeatingBaseWithPeriod(baseSystem, options);
      return {
        baseStr: "-" + result.baseStr,
        period: result.period,
        limitHit: result.limitHit
      };
    }
    const baseBigInt = BigInt(baseSystem.base);
    let num = this.#numerator;
    let den = this.#denominator;
    const integerPart = num / den;
    let remainder = num % den;
    let result = baseSystem.fromDecimal(integerPart);
    if (remainder === 0n) {
      return { baseStr: result, period: 0, limitHit: false };
    }
    result += ".";
    const remainders = new Map;
    let fractionParts = [];
    let cycleStartIndex = -1;
    let limitHit = false;
    while (remainder !== 0n) {
      if (remainders.has(remainder)) {
        cycleStartIndex = remainders.get(remainder);
        break;
      }
      if (fractionParts.length >= limit) {
        limitHit = true;
        break;
      }
      remainders.set(remainder, fractionParts.length);
      remainder *= baseBigInt;
      const digit = remainder / den;
      remainder = remainder % den;
      fractionParts.push(baseSystem.getChar(digit));
    }
    let period = 0;
    if (cycleStartIndex !== -1) {
      const nonRepeating = fractionParts.slice(0, cycleStartIndex).join("");
      const repeating = fractionParts.slice(cycleStartIndex).join("");
      period = fractionParts.length - cycleStartIndex;
      const formattedNonRepeating = useRepeatNotation ? Rational.#formatRepeatedDigits(nonRepeating) : nonRepeating;
      const formattedRepeating = useRepeatNotation ? Rational.#formatRepeatedDigits(repeating) : repeating;
      result += formattedNonRepeating + "#" + formattedRepeating;
    } else if (remainder === 0n) {
      const terminating = fractionParts.join("");
      const formattedTerminating = useRepeatNotation ? Rational.#formatRepeatedDigits(terminating) : terminating;
      result += formattedTerminating + "#0";
    } else {
      const partial = fractionParts.join("");
      const formattedPartial = useRepeatNotation ? Rational.#formatRepeatedDigits(partial) : partial;
      result += formattedPartial + "...";
      period = -1;
    }
    return { baseStr: result, period, limitHit };
  }
  periodModulo(baseSystem, limit = Rational.DEFAULT_PERIOD_MODULO_LIMIT) {
    if (!(baseSystem instanceof BaseSystem)) {
      throw new Error("Argument must be a BaseSystem");
    }
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new RangeError("Period limit must be a positive safe integer");
    }
    let den = this.#denominator;
    if (den === 1n)
      return 0;
    if (!baseSystem.supportsPositionalFractions) {
      throw new RangeError("Period calculation requires a conventional positional BaseSystem");
    }
    const baseBigInt = BigInt(baseSystem.base);
    let common = this.#gcd(den, baseBigInt);
    while (common > 1n) {
      den /= common;
      common = this.#gcd(den, baseBigInt);
    }
    if (den === 1n)
      return 0;
    let k = 1;
    let power = baseBigInt % den;
    while (power !== 1n && k <= limit) {
      power = power * baseBigInt % den;
      k++;
    }
    if (k > limit) {
      throw new Error(`Period calculation exceeded limit of ${limit} iterations. Period is likely > ${limit}.`);
    }
    return k;
  }
  toBase(baseSystem) {
    if (!(baseSystem instanceof BaseSystem)) {
      throw new Error("Argument must be a BaseSystem");
    }
    const numStr = baseSystem.fromDecimal(this.#numerator);
    if (this.#denominator === 1n) {
      return numStr;
    }
    const denStr = baseSystem.fromDecimal(this.#denominator);
    return `${numStr}/${denStr}`;
  }
  toMixedString() {
    if (this.#denominator === 1n || this.#numerator === 0n) {
      return this.#numerator.toString();
    }
    this.#computeWholePart();
    if (this.#remainder === 0n) {
      return this.#isNegative ? `-${this.#wholePart}` : `${this.#wholePart}`;
    }
    if (this.#wholePart === 0n) {
      return this.#isNegative ? `-${this.#remainder}/${this.#denominator}` : `${this.#remainder}/${this.#denominator}`;
    } else {
      return this.#isNegative ? `-${this.#wholePart}..${this.#remainder}/${this.#denominator}` : `${this.#wholePart}..${this.#remainder}/${this.#denominator}`;
    }
  }
  toNumber() {
    const numerator = this.#numerator;
    const denominator = this.#denominator;
    if (numerator === 0n)
      return 0;
    const SAFE = 9007199254740992n;
    if (numerator < SAFE && numerator > -SAFE && denominator < SAFE) {
      return Number(numerator) / Number(denominator);
    }
    const magnitude = numerator < 0n ? -numerator : numerator;
    const shift = 64 - (bitLength(magnitude) - bitLength(denominator));
    const quotient = shift >= 0 ? (magnitude << BigInt(shift)) / denominator : magnitude / (denominator << BigInt(-shift));
    const half = Math.trunc(shift / 2);
    const value = Number(quotient) * 2 ** -half * 2 ** -(shift - half);
    return numerator < 0n ? -value : value;
  }
  toRepeatingDecimal(limit = Rational.MAX_PERIOD_DIGITS, onLimit = "error") {
    const result = this.toRepeatingDecimalWithPeriod({ limit, onLimit });
    return result.decimal;
  }
  toRepeatingDecimalWithPeriod(options = true, legacyLimit, legacyOnLimit) {
    if (typeof options !== "boolean" && (options === null || typeof options !== "object" || Array.isArray(options))) {
      throw new TypeError("Repeating-decimal options must be a boolean or an object");
    }
    const normalized = typeof options === "boolean" ? {
      useRepeatNotation: options,
      limit: legacyLimit ?? Rational.MAX_PERIOD_DIGITS,
      onLimit: legacyOnLimit ?? "error"
    } : {
      useRepeatNotation: options?.useRepeatNotation ?? true,
      limit: options?.limit ?? Rational.MAX_PERIOD_DIGITS,
      onLimit: options?.onLimit ?? "error"
    };
    const { useRepeatNotation, limit, onLimit } = normalized;
    if (typeof useRepeatNotation !== "boolean") {
      throw new TypeError("Repeating-decimal useRepeatNotation option must be a boolean");
    }
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new RangeError("Repeating-decimal limit must be a positive safe integer");
    }
    if (!new Set(["trunc", "null", "error"]).has(onLimit)) {
      throw new TypeError('onLimit must be "trunc", "null", or "error"');
    }
    if (this.#numerator === 0n) {
      return { decimal: "0", period: 0, truncated: false };
    }
    this.#computeWholePart();
    this.#computeDecimalMetadata(limit);
    let result = (this.#isNegative ? "-" : "") + this.#wholePart.toString();
    if (this.#isTerminating) {
      if (this.#initialSegment) {
        const formattedInitial = useRepeatNotation ? Rational.#formatRepeatedDigits(this.#initialSegment, 7) : this.#initialSegment;
        result += "." + formattedInitial + "#0";
      }
      return { decimal: result, period: 0, truncated: false };
    } else {
      const overLimit = this.#periodLength === -1 || this.#periodLength > limit;
      if (overLimit) {
        if (onLimit === "null") {
          return { decimal: null, period: this.#periodLength, truncated: true };
        }
        if (onLimit === "error") {
          const period = this.#periodLength === -1 ? `more than ${Rational.MAX_PERIOD_CHECK.toLocaleString()}` : this.#periodLength.toString();
          throw new RangeError(`Repeating decimal period is ${period} digits, exceeding limit ${limit}`);
        }
        const initial = useRepeatNotation ? Rational.#formatRepeatedDigits(this.#initialSegment, 7) : this.#initialSegment;
        const periodPrefix = this.#periodDigits.slice(0, limit);
        const decimal = `${result}.${initial}#${periodPrefix}...`;
        return { decimal, period: this.#periodLength, truncated: true };
      }
      const periodDigits = this.#periodDigits;
      const formattedInitial = useRepeatNotation ? Rational.#formatRepeatedDigits(this.#initialSegment, 7) : this.#initialSegment;
      const displayPeriod = useRepeatNotation ? Rational.#formatRepeatedDigits(periodDigits, 7) : periodDigits;
      if (this.#initialSegment) {
        result += "." + formattedInitial + "#" + displayPeriod;
      } else {
        result += ".#" + displayPeriod;
      }
      return {
        decimal: result,
        period: this.#periodLength,
        truncated: false
      };
    }
  }
  static #countFactorsOf2(n) {
    if (n === 0n)
      return 0;
    let count = 0;
    while ((n & 1n) === 0n) {
      n >>= 1n;
      count++;
    }
    return count;
  }
  static #countFactorsOf5(n) {
    if (n === 0n)
      return 0;
    let count = 0;
    const powers = [
      { exp: 16, value: POWERS_OF_5["16"] },
      { exp: 8, value: POWERS_OF_5["8"] },
      { exp: 4, value: POWERS_OF_5["4"] },
      { exp: 2, value: POWERS_OF_5["2"] },
      { exp: 1, value: POWERS_OF_5["1"] }
    ];
    for (const { exp, value } of powers) {
      while (n % value === 0n) {
        n /= value;
        count += exp;
      }
    }
    return count;
  }
  #computeWholePart() {
    if (this.#wholePart !== undefined)
      return;
    const absNumerator = this.#numerator < 0n ? -this.#numerator : this.#numerator;
    this.#wholePart = absNumerator / this.#denominator;
    this.#remainder = absNumerator % this.#denominator;
  }
  #computeLeadingZerosInPeriod(periodRemainder) {
    if (periodRemainder * 10n >= this.#denominator)
      return 0;
    let firstNonzeroPosition = this.#denominator.toString().length - periodRemainder.toString().length;
    if (periodRemainder * 10n ** BigInt(firstNonzeroPosition) < this.#denominator) {
      firstNonzeroPosition += 1;
    }
    return Math.max(0, firstNonzeroPosition - 1);
  }
  #computeDecimalMetadata(maxPeriodDigits = Rational.MAX_PERIOD_DIGITS) {
    if (this.#periodLength !== undefined && this.#maxPeriodDigitsComputed !== undefined && this.#maxPeriodDigitsComputed >= maxPeriodDigits && this.#maxPeriodCheckComputed === Rational.MAX_PERIOD_CHECK)
      return;
    this.#computeWholePart();
    if (this.#remainder === 0n) {
      this.#initialSegment = "";
      this.#periodDigits = "";
      this.#periodLength = 0;
      this.#isTerminating = true;
      this.#factorsOf2 = 0;
      this.#factorsOf5 = 0;
      this.#leadingZerosInPeriod = 0;
      this.#initialSegmentLeadingZeros = 0;
      this.#initialSegmentRest = "";
      this.#periodDigitsRest = "";
      this.#maxPeriodDigitsComputed = maxPeriodDigits;
      this.#maxPeriodCheckComputed = Rational.MAX_PERIOD_CHECK;
      return;
    }
    this.#factorsOf2 = Rational.#countFactorsOf2(this.#denominator);
    this.#factorsOf5 = Rational.#countFactorsOf5(this.#denominator);
    const initialSegmentLength = Math.max(this.#factorsOf2, this.#factorsOf5);
    let reducedDen = this.#denominator;
    for (let i = 0;i < this.#factorsOf2; i++) {
      reducedDen /= 2n;
    }
    for (let i = 0;i < this.#factorsOf5; i++) {
      reducedDen /= 5n;
    }
    if (reducedDen === 1n) {
      const digits = [];
      let currentRemainder = this.#remainder;
      for (let i = 0;i < initialSegmentLength && currentRemainder !== 0n; i++) {
        currentRemainder *= 10n;
        const digit = currentRemainder / this.#denominator;
        digits.push(digit.toString());
        currentRemainder = currentRemainder % this.#denominator;
      }
      this.#initialSegment = digits.join("");
      this.#periodDigits = "";
      this.#periodLength = 0;
      this.#isTerminating = true;
      this.#leadingZerosInPeriod = 0;
      this.#computeDecimalPartBreakdown();
      this.#maxPeriodDigitsComputed = maxPeriodDigits;
      this.#maxPeriodCheckComputed = Rational.MAX_PERIOD_CHECK;
      return;
    }
    const maxPeriodCheck = Rational.MAX_PERIOD_CHECK;
    if (!Number.isSafeInteger(maxPeriodCheck) || maxPeriodCheck < 1) {
      throw new RangeError("Maximum period check must be a positive safe integer");
    }
    let periodLength = 1;
    let remainder = 10n % reducedDen;
    while (remainder !== 1n && periodLength < maxPeriodCheck) {
      periodLength++;
      remainder = remainder * 10n % reducedDen;
    }
    this.#periodLength = remainder === 1n ? periodLength : -1;
    this.#isTerminating = false;
    const initialDigits = [];
    let currentRemainder = this.#remainder;
    for (let i = 0;i < initialSegmentLength && currentRemainder !== 0n; i++) {
      currentRemainder *= 10n;
      const digit = currentRemainder / this.#denominator;
      initialDigits.push(digit.toString());
      currentRemainder = currentRemainder % this.#denominator;
    }
    this.#leadingZerosInPeriod = this.#computeLeadingZerosInPeriod(currentRemainder);
    const periodDigitsToCompute = this.#periodLength === -1 ? maxPeriodDigits : this.#periodLength > maxPeriodDigits ? maxPeriodDigits : this.#periodLength;
    const periodDigits = [];
    if (currentRemainder !== 0n) {
      for (let i = 0;i < periodDigitsToCompute; i++) {
        currentRemainder *= 10n;
        const digit = currentRemainder / this.#denominator;
        periodDigits.push(digit.toString());
        currentRemainder = currentRemainder % this.#denominator;
      }
    }
    this.#initialSegment = initialDigits.join("");
    this.#periodDigits = periodDigits.join("");
    this.#computeDecimalPartBreakdown();
    this.#maxPeriodDigitsComputed = maxPeriodDigits;
    this.#maxPeriodCheckComputed = maxPeriodCheck;
  }
  #computeDecimalPartBreakdown() {
    let leadingZeros = 0;
    const initialSegment = this.#initialSegment || "";
    for (let i = 0;i < initialSegment.length; i++) {
      if (initialSegment[i] === "0") {
        leadingZeros++;
      } else {
        break;
      }
    }
    this.#initialSegmentLeadingZeros = leadingZeros;
    this.#initialSegmentRest = initialSegment.substring(leadingZeros);
    const periodDigits = this.#periodDigits || "";
    this.#periodDigitsRest = periodDigits.substring(this.#leadingZerosInPeriod);
  }
  computeDecimalMetadata(maxPeriodDigits = Rational.MAX_PERIOD_DIGITS) {
    if (!Number.isSafeInteger(maxPeriodDigits) || maxPeriodDigits < 1) {
      throw new RangeError("Maximum period digits must be a positive safe integer");
    }
    if (this.#numerator === 0n) {
      return {
        initialSegment: "",
        periodDigits: "",
        periodLength: 0,
        isTerminating: true
      };
    }
    this.#computeDecimalMetadata(maxPeriodDigits);
    const periodDigits = this.#periodDigits.slice(0, maxPeriodDigits);
    return {
      wholePart: this.#wholePart,
      initialSegment: this.#initialSegment,
      initialSegmentLeadingZeros: this.#initialSegmentLeadingZeros,
      initialSegmentRest: this.#initialSegmentRest,
      periodDigits,
      periodLength: this.#periodLength,
      leadingZerosInPeriod: this.#leadingZerosInPeriod,
      periodDigitsRest: periodDigits.substring(this.#leadingZerosInPeriod),
      isTerminating: this.#isTerminating
    };
  }
  static #formatRepeatedDigits(digits, threshold = 6) {
    if (!digits || digits.length === 0)
      return digits;
    let result = "";
    let i = 0;
    while (i < digits.length) {
      let currentChar = digits[i];
      let count = 1;
      while (i + count < digits.length && digits[i + count] === currentChar) {
        count++;
      }
      if (count >= threshold) {
        result += `{${currentChar}~${count}}`;
      } else {
        result += currentChar.repeat(count);
      }
      i += count;
    }
    return result;
  }
  extractPeriodSegment(initialSegment, periodLength, digitsRequested) {
    if (periodLength === 0 || periodLength === -1) {
      return "";
    }
    const digitsToReturn = Math.min(digitsRequested, periodLength);
    const periodDigits = [];
    let currentRemainder = this.#numerator % this.#denominator;
    const isNegative = this.#numerator < 0n;
    if (isNegative) {
      currentRemainder = -currentRemainder;
    }
    for (let i = 0;i < initialSegment.length; i++) {
      currentRemainder *= 10n;
      currentRemainder = currentRemainder % this.#denominator;
    }
    for (let i = 0;i < digitsToReturn; i++) {
      currentRemainder *= 10n;
      const digit = currentRemainder / this.#denominator;
      periodDigits.push(digit.toString());
      currentRemainder = currentRemainder % this.#denominator;
    }
    return periodDigits.join("");
  }
  toDecimal(maxDigits = Rational.DEFAULT_DECIMAL_DIGITS) {
    if (!Number.isSafeInteger(maxDigits) || maxDigits < 1) {
      throw new RangeError("Decimal digit limit must be a positive safe integer");
    }
    if (this.#numerator === 0n) {
      return "0";
    }
    const isNegative = this.#numerator < 0n;
    const num = isNegative ? -this.#numerator : this.#numerator;
    const den = this.#denominator;
    const integerPart = num / den;
    let remainder = num % den;
    if (remainder === 0n) {
      return (isNegative ? "-" : "") + integerPart.toString();
    }
    const digits = [];
    for (let i = 0;i < maxDigits && remainder !== 0n; i++) {
      remainder *= 10n;
      const digit = remainder / den;
      digits.push(digit.toString());
      remainder = remainder % den;
    }
    let result = (isNegative ? "-" : "") + integerPart.toString();
    if (digits.length > 0) {
      result += "." + digits.join("");
    }
    return result;
  }
  E(exponent) {
    const exp = toExactBigInt(exponent, "Exponent");
    let powerOf10;
    if (exp >= 0n) {
      powerOf10 = new Rational(10n ** exp, 1n);
    } else {
      powerOf10 = new Rational(1n, 10n ** -exp);
    }
    return this.multiply(powerOf10);
  }
  #generatePeriodInfo(showPeriodInfo) {
    if (!showPeriodInfo || this.#isTerminating) {
      return "";
    }
    const info = [];
    if (this.#initialSegmentLeadingZeros > 0) {
      info.push(`initial: ${this.#initialSegmentLeadingZeros} zeros`);
    }
    if (this.#leadingZerosInPeriod > 0) {
      info.push(`period starts: +${this.#leadingZerosInPeriod} zeros`);
    }
    if (this.#periodLength === -1) {
      info.push(`period: >${Rational.MAX_PERIOD_CHECK.toLocaleString()}`);
    } else if (this.#periodLength > 0) {
      info.push(`period: ${this.#periodLength}`);
    }
    return info.length > 0 ? ` {${info.join(", ")}}` : "";
  }
  toScientificNotation(useRepeatNotation = true, precision = Rational.DEFAULT_SCIENTIFIC_PRECISION, showPeriodInfo = false) {
    if (typeof useRepeatNotation !== "boolean") {
      throw new TypeError("Scientific-notation useRepeatNotation must be a boolean");
    }
    if (typeof showPeriodInfo !== "boolean") {
      throw new TypeError("Scientific-notation showPeriodInfo must be a boolean");
    }
    if (!Number.isSafeInteger(precision) || precision < 1) {
      throw new RangeError("Scientific-notation precision must be a positive safe integer");
    }
    if (this.#numerator === 0n) {
      return "0";
    }
    this.#computeWholePart();
    this.#computeDecimalMetadata(precision);
    const prefix = this.#isNegative ? "-" : "";
    const format = (digits) => useRepeatNotation ? Rational.#formatRepeatedDigits(digits, 7) : digits;
    if (!this.#isTerminating && (this.#periodLength === -1 || this.#periodLength > precision)) {
      let numerator = this.#numerator < 0n ? -this.#numerator : this.#numerator;
      let denominator = this.#denominator;
      let exponent = 0;
      while (numerator >= denominator * 10n) {
        denominator *= 10n;
        exponent += 1;
      }
      while (numerator < denominator) {
        numerator *= 10n;
        exponent -= 1;
      }
      const digits = [];
      for (let i = 0;i < precision; i += 1) {
        digits.push((numerator / denominator).toString());
        numerator = numerator % denominator * 10n;
      }
      const mantissa = digits[0] + (digits.length > 1 ? `.${digits.slice(1).join("")}` : "") + "...";
      const result = `${prefix}${mantissa}E${exponent}`;
      return result + this.#generatePeriodInfo(showPeriodInfo);
    }
    const whole = this.#wholePart.toString();
    const period = this.#periodDigits;
    let firstDigit;
    let exponent;
    let nonRepeatingTail = "";
    let scientificPeriod = period;
    if (this.#wholePart > 0n) {
      firstDigit = whole[0];
      exponent = whole.length - 1;
      const wholeTail = whole.slice(1);
      nonRepeatingTail = wholeTail + this.#initialSegment;
    } else if (this.#initialSegmentRest !== "") {
      const index = this.#initialSegmentLeadingZeros;
      firstDigit = this.#initialSegment[index];
      exponent = -(index + 1);
      nonRepeatingTail = this.#initialSegment.slice(index + 1);
    } else {
      const index = period.search(/[1-9]/);
      firstDigit = period[index];
      exponent = -(this.#initialSegment.length + index + 1);
      scientificPeriod = period.slice(index + 1) + period.slice(0, index + 1);
    }
    if (!this.#isTerminating) {
      while (nonRepeatingTail.length > 0 && nonRepeatingTail.at(-1) === scientificPeriod.at(-1)) {
        nonRepeatingTail = nonRepeatingTail.slice(0, -1);
        scientificPeriod = scientificPeriod.at(-1) + scientificPeriod.slice(0, -1);
      }
    }
    if (this.#isTerminating) {
      const tail = nonRepeatingTail.replace(/0+$/, "");
      const shown = tail.slice(0, Math.max(0, precision - 1));
      const ellipsis = tail.length > shown.length ? "..." : "";
      return `${prefix}${firstDigit}${shown ? `.${shown}` : ""}${ellipsis}E${exponent}`;
    }
    const initial = format(nonRepeatingTail);
    const repeated = format(scientificPeriod);
    const mantissa = `${firstDigit}.${initial}#${repeated}`;
    const result = `${prefix}${mantissa}E${exponent}`;
    return result + this.#generatePeriodInfo(showPeriodInfo);
  }
  static from(value) {
    if (value instanceof Rational) {
      return new Rational(value.numerator, value.denominator);
    }
    return new Rational(value);
  }
  static DEFAULT_CF_LIMIT = 1000;
  static #continuedFractionArray(cfArray) {
    if (!Array.isArray(cfArray) || cfArray.length === 0) {
      throw new Error("Continued fraction array cannot be empty");
    }
    const cf = cfArray.map((term) => {
      if (typeof term === "number") {
        return toExactBigInt(term, "Continued fraction term");
      }
      if (typeof term === "bigint") {
        return term;
      }
      throw new Error(`Invalid continued fraction term: ${term}`);
    });
    for (let i = 1;i < cf.length; i++) {
      if (cf[i] <= 0n) {
        throw new Error(`Continued fraction terms must be positive: ${cf[i]}`);
      }
    }
    return cf;
  }
  static #continuedFractionString(cfString) {
    if (typeof cfString !== "string") {
      throw new TypeError("Continued fraction must be a string");
    }
    const cfMatch = cfString.match(/^(-?\d+)\.~(.*)$/);
    if (!cfMatch) {
      throw new Error("Invalid continued fraction format");
    }
    const [, integerPart, cfTermsStr] = cfMatch;
    const intPart = BigInt(integerPart);
    if (cfTermsStr === "0") {
      return [intPart];
    }
    if (cfTermsStr === "") {
      throw new Error("Continued fraction must have at least one term after .~");
    }
    if (cfTermsStr.endsWith("~")) {
      throw new Error("Continued fraction cannot end with ~");
    }
    if (cfTermsStr.includes("~~")) {
      throw new Error("Invalid continued fraction format: double tilde");
    }
    const cfTerms = cfTermsStr.split("~").map((term) => {
      if (!/^\d+$/.test(term)) {
        throw new Error(`Invalid continued fraction term: ${term}`);
      }
      const termValue = BigInt(term);
      if (termValue <= 0n) {
        throw new Error(`Continued fraction terms must be positive integers: ${term}`);
      }
      return termValue;
    });
    return [intPart, ...cfTerms];
  }
  static #convergentsForCoefficients(cf, maxCount, intermediates = false) {
    let previousPreviousNumerator = 0n;
    let previousNumerator = 1n;
    let previousPreviousDenominator = 1n;
    let previousDenominator = 0n;
    const convergents = [];
    for (let index = 0;index < cf.length; index++) {
      const coefficient = cf[index];
      let currentNumerator;
      let currentDenominator;
      if (index > 0 && intermediates) {
        for (let multiplier = 1n;multiplier <= coefficient; multiplier++) {
          currentNumerator = multiplier * previousNumerator + previousPreviousNumerator;
          currentDenominator = multiplier * previousDenominator + previousPreviousDenominator;
          convergents.push(new Rational(currentNumerator, currentDenominator));
          if (convergents.length >= maxCount) {
            return convergents;
          }
        }
      } else {
        currentNumerator = coefficient * previousNumerator + previousPreviousNumerator;
        currentDenominator = coefficient * previousDenominator + previousPreviousDenominator;
        convergents.push(new Rational(currentNumerator, currentDenominator));
        if (convergents.length >= maxCount) {
          return convergents;
        }
      }
      previousPreviousNumerator = previousNumerator;
      previousNumerator = currentNumerator;
      previousPreviousDenominator = previousDenominator;
      previousDenominator = currentDenominator;
    }
    return convergents;
  }
  static fromContinuedFraction(cfArray) {
    const cf = Rational.#continuedFractionArray(cfArray);
    if (cf.length === 1) {
      return new Rational(cf[0], 1n);
    }
    let p_prev = 1n;
    let p_curr = cf[0];
    let q_prev = 0n;
    let q_curr = 1n;
    for (let i = 1;i < cf.length; i++) {
      const a = cf[i];
      const p_next = a * p_curr + p_prev;
      const q_next = a * q_curr + q_prev;
      p_prev = p_curr;
      p_curr = p_next;
      q_prev = q_curr;
      q_curr = q_next;
    }
    return new Rational(p_curr, q_curr);
  }
  #continuedFractionResult(maxTerms, long) {
    if (this.#denominator === 1n) {
      const completeCoefficients = long ? [this.#numerator - 1n, 1n] : [this.#numerator];
      return {
        coefficients: completeCoefficients.slice(0, maxTerms),
        complete: completeCoefficients.length <= maxTerms
      };
    }
    const coefficients = [];
    let numerator = this.#numerator;
    let denominator = this.#denominator;
    const negative = numerator < 0n;
    if (negative)
      numerator = -numerator;
    let integerPart = numerator / denominator;
    if (negative) {
      integerPart = -integerPart;
      if (numerator % denominator !== 0n) {
        integerPart -= 1n;
        numerator = denominator - numerator % denominator;
      } else {
        numerator %= denominator;
      }
    } else {
      numerator %= denominator;
    }
    coefficients.push(integerPart);
    while (numerator !== 0n && coefficients.length < maxTerms) {
      coefficients.push(denominator / numerator);
      const remainder = denominator % numerator;
      denominator = numerator;
      numerator = remainder;
    }
    if (numerator !== 0n) {
      return { coefficients, complete: false };
    }
    if (coefficients.length > 1 && coefficients[coefficients.length - 1] === 1n) {
      coefficients[coefficients.length - 2] += 1n;
      coefficients.pop();
    }
    if (!long) {
      return { coefficients, complete: true };
    }
    const longCoefficients = coefficients.slice();
    longCoefficients[longCoefficients.length - 1] -= 1n;
    longCoefficients.push(1n);
    return {
      coefficients: longCoefficients.slice(0, maxTerms),
      complete: longCoefficients.length <= maxTerms
    };
  }
  toContinuedFraction(options) {
    const { maxTerms, long } = continuedFractionOptions(options, Rational.DEFAULT_CF_LIMIT);
    if (!Number.isSafeInteger(maxTerms) || maxTerms < 1) {
      throw new RangeError("Continued-fraction term limit must be a positive safe integer");
    }
    return this.#continuedFractionResult(maxTerms, long).coefficients;
  }
  toContinuedFractionString(options) {
    const { maxTerms, long } = continuedFractionOptions(options, Rational.DEFAULT_CF_LIMIT);
    if (!Number.isSafeInteger(maxTerms) || maxTerms < 1) {
      throw new RangeError("Continued-fraction term limit must be a positive safe integer");
    }
    const { coefficients: cf, complete } = this.#continuedFractionResult(maxTerms, long);
    if (cf.length === 1) {
      return complete ? `${cf[0]}.~0` : `${cf[0]}.~...`;
    }
    const intPart = cf[0];
    const cfTerms = cf.slice(1);
    const suffix = complete ? "" : "~...";
    return `${intPart}.~${cfTerms.join("~")}${suffix}`;
  }
  static fromContinuedFractionString(cfString) {
    return Rational.fromContinuedFraction(Rational.#continuedFractionString(cfString));
  }
  convergents(options) {
    const { maxCount, long, intermediates } = convergentOptions(options, Rational.DEFAULT_CF_LIMIT);
    if (!Number.isSafeInteger(maxCount) || maxCount < 1) {
      throw new RangeError("Convergent count must be a positive safe integer");
    }
    const cf = this.toContinuedFraction({ maxTerms: maxCount, long });
    return Rational.#convergentsForCoefficients(cf, maxCount, intermediates);
  }
  getConvergent(n) {
    if (!Number.isSafeInteger(n) || n < 0) {
      throw new RangeError("Convergent index must be a nonnegative safe integer");
    }
    const requestedCount = Math.min(n + 1, Number.MAX_SAFE_INTEGER);
    const convergents = this.convergents(requestedCount);
    if (n >= convergents.length) {
      throw new Error(`Convergent index ${n} out of range [0, ${convergents.length - 1}]`);
    }
    return convergents[n];
  }
  static convergentsFromCF(cfInput, maxCount = Rational.DEFAULT_CF_LIMIT) {
    if (!Number.isSafeInteger(maxCount) || maxCount < 1) {
      throw new RangeError("Convergent count must be a positive safe integer");
    }
    const cf = typeof cfInput === "string" ? Rational.#continuedFractionString(cfInput) : Rational.#continuedFractionArray(cfInput);
    return Rational.#convergentsForCoefficients(cf, maxCount);
  }
  approximationError(target) {
    if (!(target instanceof Rational)) {
      throw new Error("Target must be a Rational");
    }
    return this.subtract(target).abs();
  }
  bestApproximation(maxDenominator) {
    if (typeof maxDenominator !== "bigint" || maxDenominator < 1n) {
      throw new Error("Maximum denominator must be a positive bigint");
    }
    if (this.#denominator <= maxDenominator) {
      return new Rational(this.#numerator, this.#denominator);
    }
    const negative = this.#numerator < 0n;
    let numerator = negative ? -this.#numerator : this.#numerator;
    let denominator = this.#denominator;
    let previousNumerator = 0n;
    let previousDenominator = 1n;
    let currentNumerator = 1n;
    let currentDenominator = 0n;
    while (denominator !== 0n) {
      const coefficient = numerator / denominator;
      const nextDenominator = previousDenominator + coefficient * currentDenominator;
      if (nextDenominator > maxDenominator) {
        break;
      }
      [previousNumerator, currentNumerator] = [
        currentNumerator,
        previousNumerator + coefficient * currentNumerator
      ];
      [previousDenominator, currentDenominator] = [
        currentDenominator,
        nextDenominator
      ];
      [numerator, denominator] = [
        denominator,
        numerator - coefficient * denominator
      ];
    }
    const multiplier = (maxDenominator - previousDenominator) / currentDenominator;
    const semiconvergentNumerator = previousNumerator + multiplier * currentNumerator;
    const semiconvergentDenominator = previousDenominator + multiplier * currentDenominator;
    const targetNumerator = negative ? -this.#numerator : this.#numerator;
    const semiconvergentError = targetNumerator * semiconvergentDenominator - semiconvergentNumerator * this.#denominator;
    const convergentError = targetNumerator * currentDenominator - currentNumerator * this.#denominator;
    const absoluteSemiconvergentError = semiconvergentError < 0n ? -semiconvergentError : semiconvergentError;
    const absoluteConvergentError = convergentError < 0n ? -convergentError : convergentError;
    const useConvergent = absoluteConvergentError * semiconvergentDenominator <= absoluteSemiconvergentError * currentDenominator;
    const resultNumerator = useConvergent ? currentNumerator : semiconvergentNumerator;
    const resultDenominator = useConvergent ? currentDenominator : semiconvergentDenominator;
    return new Rational(negative ? -resultNumerator : resultNumerator, resultDenominator);
  }
  bestConvergent(maxDenominator) {
    if (typeof maxDenominator !== "bigint" || maxDenominator < 1n) {
      throw new Error("Maximum denominator must be a positive bigint");
    }
    const negative = this.#numerator < 0n;
    let numerator = negative ? -this.#numerator : this.#numerator;
    let denominator = this.#denominator;
    let previousNumerator = 0n;
    let previousDenominator = 1n;
    let currentNumerator = 1n;
    let currentDenominator = 0n;
    while (denominator !== 0n) {
      const coefficient = numerator / denominator;
      const nextNumerator = previousNumerator + coefficient * currentNumerator;
      const nextDenominator = previousDenominator + coefficient * currentDenominator;
      if (nextDenominator > maxDenominator) {
        break;
      }
      [previousNumerator, currentNumerator] = [
        currentNumerator,
        nextNumerator
      ];
      [previousDenominator, currentDenominator] = [
        currentDenominator,
        nextDenominator
      ];
      [numerator, denominator] = [
        denominator,
        numerator - coefficient * denominator
      ];
    }
    return new Rational(negative ? -currentNumerator : currentNumerator, currentDenominator);
  }
  bitLength() {
    return Math.max(bitLength(this.numerator), bitLength(this.denominator));
  }
}

// ../../packages/core/src/rational-interval.js
function hasTerminatingDecimal(value) {
  let denominator = value.denominator;
  while (denominator % 2n === 0n)
    denominator /= 2n;
  while (denominator % 5n === 0n)
    denominator /= 5n;
  return denominator === 1n;
}
function exactTerminatingDecimal(value) {
  if (!hasTerminatingDecimal(value))
    return null;
  const isNegative = value.numerator < 0n;
  const numerator = isNegative ? -value.numerator : value.numerator;
  let denominator = value.denominator;
  let twos = 0;
  let fives = 0;
  while (denominator % 2n === 0n) {
    denominator /= 2n;
    twos += 1;
  }
  while (denominator % 5n === 0n) {
    denominator /= 5n;
    fives += 1;
  }
  const decimalPlaces = Math.max(twos, fives);
  const scale = 10n ** BigInt(decimalPlaces);
  const scaled = numerator * (scale / value.denominator);
  const integerPart = scaled / scale;
  const sign = isNegative ? "-" : "";
  if (decimalPlaces === 0)
    return sign + integerPart.toString();
  const fractionalPart = (scaled % scale).toString().padStart(decimalPlaces, "0").replace(/0+$/, "");
  return fractionalPart.length === 0 ? sign + integerPart.toString() : `${sign}${integerPart}.${fractionalPart}`;
}
function exactOffsetString(value) {
  return exactTerminatingDecimal(value) ?? value.toString();
}
var OUTWARD_DECIMAL_DIGITS = 20;
function directedDecimal(value, direction, digits = OUTWARD_DECIMAL_DIGITS) {
  const scale = 10n ** BigInt(digits);
  const scaled = value.numerator * scale;
  let units = scaled / value.denominator;
  const exact = scaled % value.denominator === 0n;
  if (!exact && direction === "down" && scaled < 0n)
    units -= 1n;
  if (!exact && direction === "up" && scaled > 0n)
    units += 1n;
  const negative = units < 0n;
  const magnitude = (negative ? -units : units).toString().padStart(digits + 1, "0");
  const whole = magnitude.slice(0, -digits);
  const fraction = magnitude.slice(-digits).replace(/0+$/, "");
  const text = fraction ? `${whole}.${fraction}` : whole;
  return negative && text !== "0" ? `-${text}` : text;
}
function gcd2(a, b) {
  while (b !== 0n)
    [a, b] = [b, a % b];
  return a < 0n ? -a : a;
}
function lcm(a, b) {
  return a / gcd2(a, b) * b;
}
function randomBigIntBelow(limit, random) {
  const draw = () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError("Random source must return a finite number in [0, 1)");
    }
    return value;
  };
  if (limit <= 9007199254740992n) {
    return BigInt(Math.floor(draw() * Number(limit)));
  }
  const bitCount = limit.toString(2).length;
  const chunks = Math.ceil(bitCount / 53);
  const mask = (1n << BigInt(bitCount)) - 1n;
  const rejectedCandidates = new Set;
  while (true) {
    let candidate = 0n;
    for (let i = 0;i < chunks; i += 1) {
      candidate = candidate << 53n | BigInt(Math.floor(draw() * 9007199254740992));
    }
    candidate &= mask;
    if (candidate < limit)
      return candidate;
    if (rejectedCandidates.has(candidate)) {
      throw new RangeError("Random source repeatedly produced a rejected value; it must vary between calls");
    }
    rejectedCandidates.add(candidate);
  }
}

class RationalInterval {
  #start;
  #end;
  #low;
  #high;
  static zero = Object.freeze(new RationalInterval(Rational.zero, Rational.zero));
  static one = Object.freeze(new RationalInterval(Rational.one, Rational.one));
  static unitInterval = Object.freeze(new RationalInterval(Rational.zero, Rational.one));
  constructor(a, b) {
    const aRational = a instanceof Rational ? a : new Rational(a);
    const bRational = b instanceof Rational ? b : new Rational(b);
    this.#start = aRational;
    this.#end = bRational;
    if (aRational.lessThanOrEqual(bRational)) {
      this.#low = aRational;
      this.#high = bRational;
    } else {
      this.#low = bRational;
      this.#high = aRational;
    }
  }
  get start() {
    return this.#start;
  }
  get end() {
    return this.#end;
  }
  get isAscending() {
    return this.#start.lessThanOrEqual(this.#end);
  }
  get low() {
    return this.#low;
  }
  get high() {
    return this.#high;
  }
  add(other) {
    if (other?.isCertifiedApproximation === true) {
      return this.add(other.enclosure);
    }
    if (other.value !== undefined && typeof other.value === "bigint") {
      const otherAsRational = new Rational(other.value, 1n);
      const otherAsInterval = new RationalInterval(otherAsRational, otherAsRational);
      return this.add(otherAsInterval);
    } else if (other.numerator !== undefined && other.denominator !== undefined) {
      const otherAsInterval = new RationalInterval(other, other);
      return this.add(otherAsInterval);
    } else if (other.low && other.high) {
      const newLow = this.#low.add(other.low);
      const newHigh = this.#high.add(other.high);
      return new RationalInterval(newLow, newHigh);
    } else {
      throw new Error(`Cannot add ${other.constructor.name} to RationalInterval`);
    }
  }
  subtract(other) {
    if (other?.isCertifiedApproximation === true) {
      return this.subtract(other.enclosure);
    }
    if (other.value !== undefined && typeof other.value === "bigint") {
      const otherAsRational = new Rational(other.value, 1n);
      const otherAsInterval = new RationalInterval(otherAsRational, otherAsRational);
      return this.subtract(otherAsInterval);
    } else if (other.numerator !== undefined && other.denominator !== undefined) {
      const otherAsInterval = new RationalInterval(other, other);
      return this.subtract(otherAsInterval);
    } else if (other.low && other.high) {
      const newLow = this.#low.subtract(other.high);
      const newHigh = this.#high.subtract(other.low);
      return new RationalInterval(newLow, newHigh);
    } else {
      throw new Error(`Cannot subtract ${other.constructor.name} from RationalInterval`);
    }
  }
  multiply(other) {
    if (other?.isCertifiedApproximation === true) {
      return this.multiply(other.enclosure);
    }
    if (other.value !== undefined && typeof other.value === "bigint") {
      const otherAsRational = new Rational(other.value, 1n);
      const otherAsInterval = new RationalInterval(otherAsRational, otherAsRational);
      return this.multiply(otherAsInterval);
    } else if (other.numerator !== undefined && other.denominator !== undefined) {
      const otherAsInterval = new RationalInterval(other, other);
      return this.multiply(otherAsInterval);
    } else if (other.low && other.high) {
      const products = [
        this.#low.multiply(other.low),
        this.#low.multiply(other.high),
        this.#high.multiply(other.low),
        this.#high.multiply(other.high)
      ];
      let min = products[0];
      let max = products[0];
      for (let i = 1;i < products.length; i++) {
        if (products[i].lessThan(min))
          min = products[i];
        if (products[i].greaterThan(max))
          max = products[i];
      }
      return new RationalInterval(min, max);
    } else {
      throw new Error(`Cannot multiply RationalInterval by ${other.constructor.name}`);
    }
  }
  divide(other) {
    if (other?.isCertifiedApproximation === true) {
      return this.divide(other.enclosure);
    }
    if (other.value !== undefined && typeof other.value === "bigint") {
      if (other.value === 0n) {
        throw new Error("Division by zero");
      }
      const otherAsRational = new Rational(other.value, 1n);
      const otherAsInterval = new RationalInterval(otherAsRational, otherAsRational);
      return this.divide(otherAsInterval);
    } else if (other.numerator !== undefined && other.denominator !== undefined) {
      if (other.numerator === 0n) {
        throw new Error("Division by zero");
      }
      const otherAsInterval = new RationalInterval(other, other);
      return this.divide(otherAsInterval);
    } else if (other.low && other.high) {
      const zero = Rational.zero;
      if (other.low.equals(zero) && other.high.equals(zero)) {
        throw new Error("Division by zero");
      }
      if (other.containsZero()) {
        throw new Error("Cannot divide by an interval containing zero");
      }
      const quotients = [
        this.#low.divide(other.low),
        this.#low.divide(other.high),
        this.#high.divide(other.low),
        this.#high.divide(other.high)
      ];
      let min = quotients[0];
      let max = quotients[0];
      for (let i = 1;i < quotients.length; i++) {
        if (quotients[i].lessThan(min))
          min = quotients[i];
        if (quotients[i].greaterThan(max))
          max = quotients[i];
      }
      return new RationalInterval(min, max);
    } else {
      throw new Error(`Cannot divide RationalInterval by ${other.constructor.name}`);
    }
  }
  possibleRelationsTo(other) {
    if (other?.isCertifiedApproximation === true)
      other = other.enclosure;
    if (other?.value !== undefined && typeof other.value === "bigint") {
      other = new Rational(other.value, 1n);
    }
    if (other?.numerator !== undefined && other?.denominator !== undefined) {
      other = new RationalInterval(other, other);
    }
    if (!other?.low || !other?.high) {
      throw new TypeError("Possible relations require a Core numeric value");
    }
    let mask = 0;
    if (this.#low.lessThan(other.high))
      mask |= 1;
    if (this.#low.lessThanOrEqual(other.high) && other.low.lessThanOrEqual(this.#high))
      mask |= 2;
    if (this.#high.greaterThan(other.low))
      mask |= 4;
    return mask;
  }
  reciprocate() {
    if (this.containsZero()) {
      throw new Error("Cannot reciprocate an interval containing zero");
    }
    return new RationalInterval(this.#high.reciprocal(), this.#low.reciprocal());
  }
  negate() {
    return new RationalInterval(this.#high.negate(), this.#low.negate());
  }
  pow(exponent) {
    const n = toExactBigInt(exponent, "Exponent");
    const zero = Rational.zero;
    if (n === 0n) {
      if (this.#low.equals(zero) && this.#high.equals(zero)) {
        throw new Error("Zero cannot be raised to the power of zero");
      }
      if (this.containsZero()) {
        throw new Error("Cannot raise an interval containing zero to the power of zero");
      }
      return new RationalInterval(Rational.one, Rational.one);
    }
    if (n < 0n) {
      if (this.containsZero()) {
        throw new Error("Cannot raise an interval containing zero to a negative power");
      }
      const positivePower = this.pow(-n);
      const reciprocal = new RationalInterval(positivePower.high.reciprocal(), positivePower.low.reciprocal());
      return reciprocal;
    }
    if (n === 1n) {
      return new RationalInterval(this.#low, this.#high);
    }
    if (n % 2n === 0n) {
      let minVal;
      let maxVal;
      if (this.#low.lessThanOrEqual(zero) && this.#high.greaterThanOrEqual(zero)) {
        minVal = new Rational(0);
        const lowPow = this.#low.abs().pow(n);
        const highPow = this.#high.abs().pow(n);
        maxVal = lowPow.greaterThan(highPow) ? lowPow : highPow;
      } else if (this.#high.lessThan(zero)) {
        minVal = this.#high.pow(n);
        maxVal = this.#low.pow(n);
      } else {
        minVal = this.#low.pow(n);
        maxVal = this.#high.pow(n);
      }
      return new RationalInterval(minVal, maxVal);
    } else {
      return new RationalInterval(this.#low.pow(n), this.#high.pow(n));
    }
  }
  mpow(exponent) {
    const n = toExactBigInt(exponent, "Exponent");
    const zero = Rational.zero;
    if (n === 0n) {
      throw new Error("Multiplicative exponentiation requires at least one factor");
    }
    if (n < 0n) {
      const recipInterval = this.reciprocate();
      return recipInterval.mpow(-n);
    }
    if (n === 1n) {
      return new RationalInterval(this.#low, this.#high);
    }
    if (n === 1n) {
      return new RationalInterval(this.#low, this.#high);
    }
    let result = new RationalInterval(this.#low, this.#high);
    for (let i = 1n;i < n; i++) {
      result = result.multiply(this);
    }
    return result;
  }
  overlaps(other) {
    return !(this.#high.lessThan(other.low) || other.high.lessThan(this.#low));
  }
  contains(other) {
    return this.#low.lessThanOrEqual(other.low) && this.#high.greaterThanOrEqual(other.high);
  }
  containsValue(value) {
    const r = value instanceof Rational ? value : new Rational(value);
    return this.#low.lessThanOrEqual(r) && this.#high.greaterThanOrEqual(r);
  }
  containsZero() {
    const zero = Rational.zero;
    return this.#low.lessThanOrEqual(zero) && this.#high.greaterThanOrEqual(zero);
  }
  equals(other) {
    return this.#low.equals(other.low) && this.#high.equals(other.high);
  }
  intersection(other) {
    if (!this.overlaps(other)) {
      return null;
    }
    const newLow = this.#low.greaterThan(other.low) ? this.#low : other.low;
    const newHigh = this.#high.lessThan(other.high) ? this.#high : other.high;
    return new RationalInterval(newLow, newHigh);
  }
  union(other) {
    const adjacentRight = this.#high.equals(other.low);
    const adjacentLeft = other.high.equals(this.#low);
    if (!this.overlaps(other) && !adjacentRight && !adjacentLeft) {
      return null;
    }
    const newLow = this.#low.lessThan(other.low) ? this.#low : other.low;
    const newHigh = this.#high.greaterThan(other.high) ? this.#high : other.high;
    return new RationalInterval(newLow, newHigh);
  }
  toString() {
    return `${this.#start.toString()}:${this.#end.toString()}`;
  }
  toMixedString() {
    return `${this.#start.toMixedString()}:${this.#end.toMixedString()}`;
  }
  static point(value) {
    let r;
    if (value instanceof Rational) {
      r = value;
    } else if (value && typeof value === "object" && typeof value.value === "bigint") {
      r = new Rational(value.value);
    } else if (typeof value === "number") {
      r = new Rational(String(value));
    } else if (typeof value === "string" || typeof value === "bigint") {
      r = new Rational(value);
    } else {
      throw new Error("Point value must be an Integer or Rational input");
    }
    return new RationalInterval(r, r);
  }
  static fromString(str) {
    const parts = str.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid interval format. Use 'a:b'");
    }
    return new RationalInterval(parts[0], parts[1]);
  }
  toRepeatingDecimal(options = true) {
    const startDecimal = this.#start.toRepeatingDecimalWithPeriod(options).decimal;
    const endDecimal = this.#end.toRepeatingDecimalWithPeriod(options).decimal;
    if (startDecimal === null || endDecimal === null)
      return null;
    return `${startDecimal}:${endDecimal}`;
  }
  compactedDecimalInterval() {
    const lowerFirst = this.#start.lessThanOrEqual(this.#end);
    const startStr = directedDecimal(this.#start, lowerFirst ? "down" : "up");
    const endStr = directedDecimal(this.#end, lowerFirst ? "up" : "down");
    let commonPrefix = "";
    const minLength = Math.min(startStr.length, endStr.length);
    for (let i = 0;i < minLength; i++) {
      if (startStr[i] === endStr[i]) {
        commonPrefix += startStr[i];
      } else {
        break;
      }
    }
    if (commonPrefix.length <= 1 || commonPrefix.startsWith("-") && commonPrefix.length <= 2) {
      return `${startStr}:${endStr}`;
    }
    const startSuffix = startStr.substring(commonPrefix.length);
    const endSuffix = endStr.substring(commonPrefix.length);
    if (!startSuffix || !endSuffix || startSuffix.length !== endSuffix.length) {
      return `${startStr}:${endStr}`;
    }
    if (!/^\d+$/.test(startSuffix) || !/^\d+$/.test(endSuffix)) {
      return `${startStr}:${endStr}`;
    }
    return `${commonPrefix}[${startSuffix}:${endSuffix}]`;
  }
  relativeMidDecimalInterval() {
    const exactMidpoint = this.#low.add(this.#high).divide(new Rational(2));
    let midpointStr = exactTerminatingDecimal(exactMidpoint);
    if (midpointStr === null || midpointStr.split(".")[1]?.length > OUTWARD_DECIMAL_DIGITS) {
      const halfWidth = this.#high.subtract(exactMidpoint);
      let places = 0;
      while (places < OUTWARD_DECIMAL_DIGITS && halfWidth.multiply(new Rational(10n ** BigInt(places))).lessThan(Rational.one)) {
        places += 1;
      }
      midpointStr = directedDecimal(exactMidpoint, "down", Math.min(places + 1, OUTWARD_DECIMAL_DIGITS));
    }
    const midpoint = new Rational(midpointStr);
    const decimalPlaces = midpointStr.includes(".") ? midpointStr.split(".")[1].length : 0;
    const scaleFactor = new Rational(10n ** BigInt(decimalPlaces));
    const below = midpoint.subtract(this.#low).multiply(scaleFactor);
    const above = this.#high.subtract(midpoint).multiply(scaleFactor);
    if (below.equals(above) || below.lessThan(Rational.zero) || above.lessThan(Rational.zero)) {
      const radius = below.abs().greaterThan(above.abs()) ? below.abs() : above.abs();
      return `${midpointStr}[+-${directedDecimal(radius, "up")}]`;
    }
    const lowOffset = below.negate();
    const lowStr = directedDecimal(lowOffset, "down");
    const highStr = directedDecimal(above, "up");
    const lowSign = lowOffset.compareTo(Rational.zero) > 0 ? "+" : "";
    const highSign = above.compareTo(Rational.zero) > 0 ? "+" : "";
    const [first, second] = this.#start.lessThanOrEqual(this.#end) ? [`${lowSign}${lowStr}`, `${highSign}${highStr}`] : [`${highSign}${highStr}`, `${lowSign}${lowStr}`];
    return `${midpointStr}[${first}:${second}]`;
  }
  relativeDecimalInterval() {
    if (this.#low.equals(this.#high)) {
      return this.toRepeatingDecimal();
    }
    const shortestDecimal = this.#findShortestPreciseDecimal();
    const offsetStart = this.#start.subtract(shortestDecimal);
    const offsetEnd = this.#end.subtract(shortestDecimal);
    const decimalStr = exactTerminatingDecimal(shortestDecimal);
    if (decimalStr === null) {
      throw new Error("Shortest decimal search returned a non-terminating value");
    }
    const decimalPlaces = decimalStr.includes(".") ? decimalStr.split(".")[1].length : 0;
    let scaledOffsetStart, scaledOffsetEnd;
    if (decimalPlaces === 0) {
      scaledOffsetStart = offsetStart;
      scaledOffsetEnd = offsetEnd;
    } else {
      const scaleFactor = new Rational(10).pow(decimalPlaces);
      scaledOffsetStart = offsetStart.multiply(scaleFactor);
      scaledOffsetEnd = offsetEnd.multiply(scaleFactor);
    }
    if (offsetStart.equals(offsetEnd.negate())) {
      return `${decimalStr}[+-${exactOffsetString(scaledOffsetEnd.abs())}]`;
    } else {
      const off1 = { v: scaledOffsetStart };
      const off2 = { v: scaledOffsetEnd };
      const sorted = [off1, off2].sort((a, b) => b.v.compareTo(a.v));
      const s1 = "+" + exactOffsetString(sorted[0].v.abs());
      const s2 = "-" + exactOffsetString(sorted[1].v.abs());
      return `${decimalStr}[${s1}:${s2}]`;
    }
  }
  #findShortestPreciseDecimal() {
    const midpoint = this.#low.add(this.#high).divide(new Rational(2));
    let scale = Rational.one;
    while (true) {
      const lowScaled = this.#low.multiply(scale);
      const highScaled = this.#high.multiply(scale);
      const minInt = this.#ceilRational(lowScaled);
      const maxInt = this.#floorRational(highScaled);
      if (minInt.compareTo(maxInt) <= 0) {
        const scaledMidpoint = midpoint.multiply(scale);
        let bestInt;
        if (scaledMidpoint.lessThanOrEqual(minInt)) {
          bestInt = minInt;
        } else if (scaledMidpoint.greaterThanOrEqual(maxInt)) {
          bestInt = maxInt;
        } else {
          const lower = this.#floorRational(scaledMidpoint);
          const upper = this.#ceilRational(scaledMidpoint);
          const lowerDistance = scaledMidpoint.subtract(lower).abs();
          const upperDistance = upper.subtract(scaledMidpoint).abs();
          bestInt = lowerDistance.lessThanOrEqual(upperDistance) ? lower : upper;
        }
        return bestInt.divide(scale);
      }
      scale = scale.multiply(new Rational(10));
    }
  }
  #ceilRational(rational) {
    if (rational.denominator === 1n) {
      return rational;
    }
    const quotient = rational.numerator / rational.denominator;
    if (rational.numerator >= 0n) {
      return new Rational(quotient + 1n, 1n);
    } else {
      return new Rational(quotient, 1n);
    }
  }
  #floorRational(rational) {
    if (rational.denominator === 1n) {
      return rational;
    }
    const quotient = rational.numerator / rational.denominator;
    if (rational.numerator >= 0n) {
      return new Rational(quotient, 1n);
    } else {
      return new Rational(quotient - 1n, 1n);
    }
  }
  mediant() {
    return new Rational(this.#low.numerator + this.#high.numerator, this.#low.denominator + this.#high.denominator);
  }
  midpoint() {
    return this.#low.add(this.#high).divide(new Rational(2));
  }
  shortestDecimal(base = 10) {
    const baseBigInt = toExactBigInt(base, "Base");
    if (baseBigInt <= 1n) {
      throw new Error("Base must be greater than 1");
    }
    if (this.#low.equals(this.#high)) {
      const value = this.#low;
      let remainingDenominator = value.denominator;
      while (remainingDenominator !== 1n) {
        const commonFactor = this.#gcd(remainingDenominator, baseBigInt);
        if (commonFactor === 1n)
          return null;
        remainingDenominator /= commonFactor;
      }
      return new Rational(value.numerator, value.denominator);
    }
    let denominator = 1n;
    while (true) {
      const minNumerator = this.#ceilRational(this.#low.multiply(new Rational(denominator)));
      const maxNumerator = this.#floorRational(this.#high.multiply(new Rational(denominator)));
      if (minNumerator.lessThanOrEqual(maxNumerator)) {
        return new Rational(minNumerator.numerator, denominator);
      }
      denominator *= baseBigInt;
    }
  }
  denominatorInterval(denominator, onEmpty = "error") {
    const gridDenominator = denominator === undefined ? lcm(this.#low.denominator, this.#high.denominator) : toExactBigInt(denominator, "Grid denominator");
    if (gridDenominator <= 0n) {
      throw new RangeError("Grid denominator must be positive");
    }
    if (!new Set(["mid", "null", "error"]).has(onEmpty)) {
      throw new TypeError('onEmpty must be "mid", "null", or "error"');
    }
    const first = this.#ceilRational(this.#low.multiply(new Rational(gridDenominator))).numerator;
    const last = this.#floorRational(this.#high.multiply(new Rational(gridDenominator))).numerator;
    if (first <= last) {
      return new RationalInterval(new Rational(first, gridDenominator), new Rational(last, gridDenominator));
    }
    if (onEmpty === "null")
      return null;
    if (onEmpty === "mid")
      return RationalInterval.point(this.midpoint());
    throw new RangeError(`No rational with grid denominator ${gridDenominator} lies in this interval`);
  }
  randomRational(denominator, onEmpty = "error", random = Math.random) {
    if (typeof random !== "function") {
      throw new TypeError("Random source must be a function");
    }
    const gridDenominator = denominator === undefined ? lcm(this.#low.denominator, this.#high.denominator) : toExactBigInt(denominator, "Grid denominator");
    const grid = this.denominatorInterval(gridDenominator, onEmpty);
    if (grid === null)
      return null;
    const first = this.#ceilRational(this.#low.multiply(new Rational(gridDenominator))).numerator;
    const last = this.#floorRational(this.#high.multiply(new Rational(gridDenominator))).numerator;
    if (first > last)
      return grid.start;
    const numerator = first + randomBigIntBelow(last - first + 1n, random);
    return new Rational(numerator, gridDenominator);
  }
  #gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
  E(exponent) {
    const exp = toExactBigInt(exponent, "Exponent");
    let powerOf10;
    if (exp >= 0n) {
      powerOf10 = new Rational(10n ** exp, 1n);
    } else {
      powerOf10 = new Rational(1n, 10n ** -exp);
    }
    const newLow = this.#low.multiply(powerOf10);
    const newHigh = this.#high.multiply(powerOf10);
    return new RationalInterval(newLow, newHigh);
  }
  bitLength() {
    const lowBits = this.#low.bitLength();
    const highBits = this.#high.bitLength();
    return Math.max(lowBits, highBits);
  }
  toJSON() {
    return { $ratmath: "RationalInterval", start: this.#start, end: this.#end };
  }
}

// ../../packages/core/src/integer.js
function integerDivisor(other, zeroMessage) {
  if (!(other instanceof Integer)) {
    throw new TypeError("Floor division and modulo require an Integer divisor");
  }
  if (other.value === 0n)
    throw new Error(zeroMessage);
  return other.value;
}

class Integer {
  #value;
  static zero = new Integer(0);
  static one = new Integer(1);
  constructor(value) {
    if (value instanceof Integer) {
      this.#value = value.value;
    } else if (typeof value === "string") {
      const trimmed = value.trim();
      if (!/^-?\d+$/.test(trimmed)) {
        throw new Error("Invalid integer format. Must be a whole number");
      }
      this.#value = BigInt(trimmed);
    } else {
      this.#value = toExactBigInt(value, "Integer value");
    }
  }
  get value() {
    return this.#value;
  }
  add(other) {
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("add", this);
    }
    if (other instanceof Integer) {
      return new Integer(this.#value + other.value);
    } else if (other instanceof Rational) {
      const thisAsRational = new Rational(this.#value, 1n);
      return thisAsRational.add(other);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const thisAsRational = new Rational(this.#value, 1n);
      const IntervalClass = other.constructor;
      const thisAsInterval = new IntervalClass(thisAsRational, thisAsRational);
      return thisAsInterval.add(other);
    } else {
      throw new Error(`Cannot add ${other.constructor.name} to Integer`);
    }
  }
  subtract(other) {
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("subtract", this);
    }
    if (other instanceof Integer) {
      return new Integer(this.#value - other.value);
    } else if (other instanceof Rational) {
      const thisAsRational = new Rational(this.#value, 1n);
      return thisAsRational.subtract(other);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const thisAsRational = new Rational(this.#value, 1n);
      const IntervalClass = other.constructor;
      const thisAsInterval = new IntervalClass(thisAsRational, thisAsRational);
      return thisAsInterval.subtract(other);
    } else {
      throw new Error(`Cannot subtract ${other.constructor.name} from Integer`);
    }
  }
  multiply(other) {
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("multiply", this);
    }
    if (other instanceof Integer) {
      return new Integer(this.#value * other.value);
    } else if (other instanceof Rational) {
      const thisAsRational = new Rational(this.#value, 1n);
      return thisAsRational.multiply(other);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const thisAsRational = new Rational(this.#value, 1n);
      const IntervalClass = other.constructor;
      const thisAsInterval = new IntervalClass(thisAsRational, thisAsRational);
      return thisAsInterval.multiply(other);
    } else {
      throw new Error(`Cannot multiply Integer by ${other.constructor.name}`);
    }
  }
  divide(other) {
    if (other?.isCertifiedApproximation === true) {
      return other._operateExactLeft("divide", this);
    }
    if (other instanceof Integer) {
      if (other.value === 0n) {
        throw new Error("Division by zero");
      }
      if (this.#value % other.value === 0n) {
        return new Integer(this.#value / other.value);
      } else {
        return new Rational(this.#value, other.value);
      }
    } else if (other instanceof Rational) {
      const thisAsRational = new Rational(this.#value, 1n);
      return thisAsRational.divide(other);
    } else if (other.low && other.high && typeof other.low.equals === "function") {
      const thisAsRational = new Rational(this.#value, 1n);
      const IntervalClass = other.constructor;
      const thisAsInterval = new IntervalClass(thisAsRational, thisAsRational);
      return thisAsInterval.divide(other);
    } else {
      throw new Error(`Cannot divide Integer by ${other.constructor.name}`);
    }
  }
  possibleRelationsTo(other) {
    const point = new Rational(this.#value, 1n);
    if (other?.isCertifiedApproximation === true)
      other = other.enclosure;
    if (other instanceof Integer)
      return this.#value < other.value ? 1 : this.#value > other.value ? 4 : 2;
    if (other instanceof Rational)
      return point.lessThan(other) ? 1 : point.greaterThan(other) ? 4 : 2;
    if (other?.low && other?.high) {
      let mask = 0;
      if (point.lessThan(other.high))
        mask |= 1;
      if (other.low.lessThanOrEqual(point) && point.lessThanOrEqual(other.high))
        mask |= 2;
      if (point.greaterThan(other.low))
        mask |= 4;
      return mask;
    }
    throw new TypeError("Possible relations require a Core numeric value");
  }
  floorDivide(other) {
    const divisor = integerDivisor(other, "Division by zero");
    const quotient = this.#value / divisor;
    const remainder = this.#value % divisor;
    return new Integer(remainder !== 0n && remainder < 0n !== divisor < 0n ? quotient - 1n : quotient);
  }
  floorModulo(other) {
    const divisor = integerDivisor(other, "Modulo by zero");
    const remainder = this.#value % divisor;
    return new Integer(remainder !== 0n && remainder < 0n !== divisor < 0n ? remainder + divisor : remainder);
  }
  divmod(other) {
    const divisor = integerDivisor(other, "Division by zero");
    let quotient = this.#value / divisor;
    let remainder = this.#value % divisor;
    if (remainder !== 0n && remainder < 0n !== divisor < 0n) {
      quotient -= 1n;
      remainder += divisor;
    }
    return [new Integer(quotient), new Integer(remainder)];
  }
  modulo(other) {
    if (other.value === 0n) {
      throw new Error("Modulo by zero");
    }
    return new Integer(this.#value % other.value);
  }
  negate() {
    return new Integer(-this.#value);
  }
  pow(exponent) {
    const exp = exponent instanceof Integer ? exponent.value : toExactBigInt(exponent, "Exponent");
    if (exp === 0n) {
      if (this.#value === 0n) {
        throw new Error("Zero cannot be raised to the power of zero");
      }
      return new Integer(1);
    }
    if (exp < 0n) {
      if (this.#value === 0n) {
        throw new Error("Zero cannot be raised to a negative power");
      }
      const positiveExp = -exp;
      const positiveResult = this.pow(positiveExp);
      return new Rational(1, positiveResult.value);
    }
    return new Integer(this.#value ** exp);
  }
  equals(other) {
    if (other instanceof Rational) {
      return other.denominator === 1n && this.#value === other.numerator;
    }
    return this.#value === other?.value;
  }
  compareTo(other) {
    const order = this.#order(other);
    return Number.isNaN(order) ? 0 : order;
  }
  #order(other) {
    let left = this.#value;
    let right;
    if (other instanceof Rational) {
      left *= other.denominator;
      right = other.numerator;
    } else if (typeof other?.value === "bigint") {
      right = other.value;
    } else {
      return NaN;
    }
    if (left < right)
      return -1;
    if (left > right)
      return 1;
    return 0;
  }
  lessThan(other) {
    return this.#order(other) < 0;
  }
  lessThanOrEqual(other) {
    return this.#order(other) <= 0;
  }
  greaterThan(other) {
    return this.#order(other) > 0;
  }
  greaterThanOrEqual(other) {
    return this.#order(other) >= 0;
  }
  abs() {
    return this.#value < 0n ? this.negate() : new Integer(this.#value);
  }
  sign() {
    if (this.#value < 0n)
      return new Integer(-1);
    if (this.#value > 0n)
      return new Integer(1);
    return new Integer(0);
  }
  isEven() {
    return this.#value % 2n === 0n;
  }
  isOdd() {
    return this.#value % 2n !== 0n;
  }
  isZero() {
    return this.#value === 0n;
  }
  isPositive() {
    return this.#value > 0n;
  }
  isNegative() {
    return this.#value < 0n;
  }
  gcd(other) {
    let a = this.#value < 0n ? -this.#value : this.#value;
    let b = other.value < 0n ? -other.value : other.value;
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return new Integer(a);
  }
  lcm(other) {
    if (this.#value === 0n || other.value === 0n) {
      return new Integer(0);
    }
    const gcd = this.gcd(other);
    const product = this.multiply(other).abs();
    return product.divide(gcd);
  }
  toString(base) {
    if (base === undefined) {
      return this.#value.toString();
    }
    if (base instanceof BaseSystem) {
      return base.fromDecimal(this.#value);
    }
    if (typeof base === "number") {
      if (base === 10) {
        return this.#value.toString();
      }
      return BaseSystem.fromBase(base).fromDecimal(this.#value);
    }
    return this.#value.toString();
  }
  toBase(baseSystem) {
    if (!(baseSystem instanceof BaseSystem)) {
      throw new Error("Argument must be a BaseSystem");
    }
    return baseSystem.fromDecimal(this.#value);
  }
  toNumber() {
    return Number(this.#value);
  }
  toRational() {
    return new Rational(this.#value, 1n);
  }
  static from(value) {
    if (value instanceof Integer) {
      return new Integer(value.value);
    }
    return new Integer(value);
  }
  static fromRational(rational) {
    if (rational.denominator !== 1n) {
      throw new Error("Rational is not a whole number");
    }
    return new Integer(rational.numerator);
  }
  E(exponent) {
    const exp = toExactBigInt(exponent, "Exponent");
    if (exp >= 0n) {
      const newValue = this.#value * 10n ** exp;
      return new Integer(newValue);
    } else {
      const powerOf10 = new Rational(1n, 10n ** -exp);
      const thisAsRational = new Rational(this.#value, 1n);
      return thisAsRational.multiply(powerOf10);
    }
  }
  factorial() {
    if (this.#value < 0n) {
      throw new Error("Factorial is not defined for negative integers");
    }
    if (this.#value === 0n || this.#value === 1n) {
      return new Integer(1);
    }
    let result = 1n;
    for (let i = 2n;i <= this.#value; i++) {
      result *= i;
    }
    return new Integer(result);
  }
  doubleFactorial() {
    if (this.#value < 0n) {
      throw new Error("Double factorial is not defined for negative integers");
    }
    if (this.#value === 0n || this.#value === 1n) {
      return new Integer(1);
    }
    let result = 1n;
    for (let i = this.#value;i > 0n; i -= 2n) {
      result *= i;
    }
    return new Integer(result);
  }
  bitLength() {
    if (this.#value === 0n)
      return 0;
    return this.#value < 0n ? (-this.#value).toString(2).length : this.#value.toString(2).length;
  }
  toJSON() {
    return { $ratmath: "Integer", value: this.#value.toString() };
  }
}

// ../../packages/reals/src/index.js
var LN2_CF = [0, 1, 2, 3, 1, 6, 3, 1, 1, 2, 1, 1, 1, 1, 3, 10, 1, 1, 1, 2, 1, 1, 1, 1, 3, 2, 3, 1, 13, 7, 4, 1, 1, 1, 7, 2, 4, 1, 1, 2, 5, 14, 1, 10, 1, 4, 2, 18, 3, 1, 4, 1, 6, 2, 7, 3, 3, 1, 13, 3, 1, 4, 4, 1, 3, 1, 1, 1, 1, 2, 17, 3, 1, 2, 32, 1, 1, 1, 1, 3, 1, 4, 5, 1, 1, 4, 1, 3, 9, 8, 1, 1, 7, 1, 1, 1, 1, 1, 1, 1];
var PI_CF = [3, 7, 15, 1, 292, 1, 1, 1, 2, 1, 3, 1, 14, 2, 1, 1, 2, 2, 2, 2, 1, 84, 2, 1, 1, 15, 3, 13, 1, 4, 2, 6, 6, 99, 1, 2, 2, 6, 3, 5, 1, 1, 6, 8, 1, 7, 1, 2, 3, 7, 1, 2, 1, 1, 12, 1, 1, 1, 3, 1, 1, 8, 1, 1, 2, 1, 6];
var E_CF = [2, 1, 2, 1, 1, 4, 1, 1, 6, 1, 1, 8, 1, 1, 10, 1, 1, 12, 1, 1, 14, 1, 1, 16, 1, 1, 18, 1, 1, 20, 1, 1, 22, 1, 1, 24, 1, 1, 26, 1, 1, 28, 1, 1, 30, 1, 1, 32, 1, 1, 34, 1, 1, 36, 1, 1, 38, 1, 1, 40];
function continuedFractionApproximation(coefficients, terms) {
  if (terms === 0 || coefficients.length === 0) {
    return new Rational(0);
  }
  let num = new Integer(1);
  let den = new Integer(0);
  for (let i = Math.min(terms, coefficients.length) - 1;i >= 0; i--) {
    [num, den] = [den.add(num.multiply(new Integer(coefficients[i]))), num];
  }
  return new Rational(num.value, den.value);
}
function isZero(rational) {
  return rational.numerator === 0n;
}
function isNegative(rational) {
  return rational.numerator < 0n;
}
function floor(rational) {
  if (rational.denominator === 1n) {
    return new Rational(rational.numerator);
  }
  const quotient = rational.numerator / rational.denominator;
  const remainder = rational.numerator % rational.denominator;
  if (remainder === 0n || rational.numerator >= 0n) {
    return new Rational(quotient);
  } else {
    return new Rational(quotient - 1n);
  }
}
function round(rational) {
  if (rational.denominator === 1n) {
    return new Rational(rational.numerator);
  }
  const wholePart = floor(rational);
  const fractionalPart = rational.subtract(wholePart);
  const half = new Rational(1, 2);
  if (fractionalPart.compareTo(half) >= 0) {
    return wholePart.add(new Rational(1));
  } else {
    return wholePart;
  }
}
function parsePrecision(precision) {
  if (precision === undefined) {
    return { epsilon: new Rational(1, 1e6), negative: true };
  }
  if (precision < 0) {
    const denominator = new Integer(10).pow(-precision);
    return { epsilon: new Rational(1, denominator.value), negative: true };
  } else {
    return { epsilon: new Rational(1, precision), negative: false };
  }
}
function createTightRationalInterval(value, precision) {
  const { epsilon } = parsePrecision(precision);
  const epsilonDecimal = epsilon.toNumber();
  const lowerDecimal = value - epsilonDecimal;
  const upperDecimal = value + epsilonDecimal;
  const precisionScale = Math.min(1e9, Math.max(1e6, Math.ceil(1 / epsilonDecimal)));
  const lower = new Rational(Math.floor(lowerDecimal * precisionScale), precisionScale);
  const upper = new Rational(Math.ceil(upperDecimal * precisionScale), precisionScale);
  return new RationalInterval(lower, upper);
}
function getConstant(cfCoefficients, precision) {
  const { epsilon } = parsePrecision(precision);
  let terms = 2;
  let prev = continuedFractionApproximation(cfCoefficients, terms - 1);
  let curr = continuedFractionApproximation(cfCoefficients, terms);
  while (terms < cfCoefficients.length && curr.subtract(prev).abs().compareTo(epsilon) > 0) {
    terms++;
    prev = curr;
    curr = continuedFractionApproximation(cfCoefficients, terms);
  }
  const lower = prev.compareTo(curr) < 0 ? prev : curr;
  const upper = prev.compareTo(curr) > 0 ? prev : curr;
  return new RationalInterval(lower, upper);
}
function dyadicGrid(epsilon) {
  let denominator = 1n;
  const target = epsilon.divide(new Rational(64));
  while (new Rational(1n, denominator).compareTo(target) > 0)
    denominator <<= 1n;
  return denominator;
}
function snapDown(value, denominator) {
  return new Rational(floorDiv(value.numerator * denominator, value.denominator), denominator);
}
function snapUp(value, denominator) {
  return new Rational(-floorDiv(-value.numerator * denominator, value.denominator), denominator);
}
function floorDiv(a, b) {
  const q = a / b;
  return a % b !== 0n && a < 0n !== b < 0n ? q - 1n : q;
}
function expSeriesBounds(r, tolerance) {
  let sum = new Rational(1);
  let term = new Rational(1);
  let n = 0;
  do {
    n++;
    term = term.multiply(r).divide(new Rational(n));
    sum = sum.add(term);
  } while (term.abs().compareTo(tolerance) > 0);
  const errorBound = term.abs().multiply(new Rational(2));
  return new RationalInterval(sum.subtract(errorBound), sum.add(errorBound));
}
function atanhSeriesBounds(z, tolerance) {
  let sum = new Rational(0);
  let power = z;
  const zSquared = z.multiply(z);
  let n = 0;
  let tail;
  do {
    sum = sum.add(power.divide(new Rational(2 * n + 1)));
    power = power.multiply(zSquared);
    n++;
    tail = power.divide(new Rational(1).subtract(zSquared));
  } while (tail.compareTo(tolerance) > 0);
  return new RationalInterval(sum, sum.add(tail));
}
var PI = (precision) => getConstant(PI_CF, precision);
var E = (precision) => getConstant(E_CF, precision);
function EXP(x, precision) {
  if (x === undefined) {
    return E(precision);
  }
  const { epsilon } = parsePrecision(precision);
  if (x instanceof RationalInterval) {
    const lower = EXP(x.low, precision);
    const upper = EXP(x.high, precision);
    return new RationalInterval(lower.low, upper.high);
  }
  if (!(x instanceof Rational)) {
    x = new Rational(x);
  }
  if (isZero(x)) {
    return new RationalInterval(new Rational(1), new Rational(1));
  }
  const ln2Interval = getConstant(LN2_CF, precision);
  const ln2Approx = ln2Interval.low.add(ln2Interval.high).divide(new Rational(2));
  const k = floor(x.divide(ln2Approx));
  const [ln2ForLow, ln2ForHigh] = isNegative(k) ? [ln2Interval.low, ln2Interval.high] : [ln2Interval.high, ln2Interval.low];
  const grid = dyadicGrid(epsilon);
  const rLow = snapDown(x.subtract(k.multiply(ln2ForLow)), grid);
  const rHigh = snapUp(x.subtract(k.multiply(ln2ForHigh)), grid);
  const tolerance = epsilon.divide(new Rational(8));
  const expR = new RationalInterval(expSeriesBounds(rLow, tolerance).low, expSeriesBounds(rHigh, tolerance).high);
  if (isZero(k)) {
    return expR;
  }
  const twoToK = new Rational(new Integer(2).pow(k.numerator >= 0n ? k.numerator : -k.numerator).value, 1);
  if (isNegative(k)) {
    return expR.divide(twoToK);
  } else {
    return expR.multiply(twoToK);
  }
}
function LN(x, precision) {
  const { epsilon } = parsePrecision(precision);
  if (x instanceof RationalInterval) {
    if (isNegative(x.low) || isZero(x.low)) {
      throw new Error("LN: argument must be positive");
    }
    const lower = LN(x.low, precision);
    const upper = LN(x.high, precision);
    return new RationalInterval(lower.low, upper.high);
  }
  if (!(x instanceof Rational)) {
    x = new Rational(x);
  }
  if (isNegative(x) || isZero(x)) {
    throw new Error("LN: argument must be positive");
  }
  if (x.equals(new Rational(1))) {
    return new RationalInterval(new Rational(0), new Rational(0));
  }
  let k = 0;
  let xScaled = x;
  if (x.compareTo(new Rational(1)) > 0) {
    while (xScaled.compareTo(new Rational(2)) >= 0) {
      xScaled = xScaled.divide(new Rational(2));
      k++;
    }
  } else {
    while (xScaled.compareTo(new Rational(1)) < 0) {
      xScaled = xScaled.multiply(new Rational(2));
      k--;
    }
  }
  const z = xScaled.subtract(new Rational(1)).divide(xScaled.add(new Rational(1)));
  const grid = dyadicGrid(epsilon);
  const tolerance = epsilon.divide(new Rational(8));
  const lnM = new RationalInterval(atanhSeriesBounds(snapDown(z, grid), tolerance).low.multiply(new Rational(2)), atanhSeriesBounds(snapUp(z, grid), tolerance).high.multiply(new Rational(2)));
  if (k === 0) {
    return lnM;
  }
  const ln2Interval = getConstant(LN2_CF, precision);
  const kLn2 = ln2Interval.multiply(new Rational(k));
  return lnM.add(kLn2);
}
function LOG(x, base = 10, precision) {
  if (base === undefined || typeof base === "number" && base < 0) {
    precision = base;
    base = 10;
  }
  const lnX = LN(x, precision);
  const lnBase = LN(new Rational(base), precision);
  return lnX.divide(lnBase);
}
function SIN(x, precision) {
  const { epsilon } = parsePrecision(precision);
  if (x instanceof RationalInterval) {
    const samples = 100;
    let min = null, max = null;
    for (let i = 0;i <= samples; i++) {
      const t = x.low.add(x.high.subtract(x.low).multiply(new Rational(i)).divide(new Rational(samples)));
      const sinT = SIN(t, precision);
      if (min === null || sinT.low.compareTo(min) < 0)
        min = sinT.low;
      if (max === null || sinT.high.compareTo(max) > 0)
        max = sinT.high;
    }
    return new RationalInterval(min, max);
  }
  if (!(x instanceof Rational)) {
    x = new Rational(x);
  }
  const piInterval = PI(precision);
  const piApprox = piInterval.low.add(piInterval.high).divide(new Rational(2));
  const piOver2 = piApprox.divide(new Rational(2));
  const k = round(x.divide(piOver2));
  const r = x.subtract(k.multiply(piOver2));
  const kMod4 = Number(k.numerator % 4n);
  let usecos = false;
  let negate = false;
  switch (kMod4) {
    case 0:
      break;
    case 1:
      usecos = true;
      break;
    case 2:
      negate = true;
      break;
    case 3:
      usecos = true;
      negate = true;
      break;
  }
  let sum = new Rational(0);
  let term = r;
  let n = 1;
  if (usecos) {
    sum = new Rational(1);
    term = new Rational(1);
    n = 0;
  }
  while (term.abs().compareTo(epsilon) > 0 && n < 100) {
    if (usecos) {
      if (n > 0) {
        term = term.multiply(r).multiply(r).negate().divide(new Rational((2 * n - 1) * (2 * n)));
        sum = sum.add(term);
      }
    } else {
      sum = sum.add(term);
      term = term.multiply(r).multiply(r).negate().divide(new Rational((n + 1) * (n + 2)));
    }
    n++;
    if (sum.denominator > 100000000000n || term.denominator > 100000000000n) {
      break;
    }
  }
  if (negate) {
    sum = sum.negate();
  }
  const errorBound = term.abs().multiply(new Rational(2));
  return new RationalInterval(sum.subtract(errorBound), sum.add(errorBound));
}
function COS(x, precision) {
  const { epsilon } = parsePrecision(precision);
  const piInterval = PI(precision);
  const piOver2 = piInterval.divide(new Rational(2));
  if (x instanceof RationalInterval) {
    return SIN(x.add(piOver2), precision);
  } else {
    const piOver2Mid = piOver2.low.add(piOver2.high).divide(new Rational(2));
    const xRational = x instanceof Rational ? x : new Rational(x);
    return SIN(xRational.add(piOver2Mid), precision);
  }
}
function ARCSIN(x, precision) {
  const { epsilon } = parsePrecision(precision);
  if (x instanceof RationalInterval) {
    if (x.low.compareTo(new Rational(-1)) < 0 || x.high.compareTo(new Rational(1)) > 0) {
      throw new Error("ARCSIN: argument must be in [-1, 1]");
    }
    const lower = ARCSIN(x.low, precision);
    const upper = ARCSIN(x.high, precision);
    return new RationalInterval(lower.low, upper.high);
  }
  if (!(x instanceof Rational)) {
    x = new Rational(x);
  }
  if (x.compareTo(new Rational(-1)) < 0 || x.compareTo(new Rational(1)) > 0) {
    throw new Error("ARCSIN: argument must be in [-1, 1]");
  }
  if (isZero(x)) {
    return new RationalInterval(new Rational(0), new Rational(0));
  }
  let sum = x;
  let term = x;
  let n = 1;
  let converged = false;
  while (term.abs().compareTo(epsilon) > 0 && n < 30) {
    term = term.multiply(x).multiply(x).multiply(new Rational((2 * n - 1) * (2 * n - 1))).divide(new Rational(2 * n * (2 * n + 1)));
    sum = sum.add(term);
    n++;
    if (sum.denominator > 1000000000n || term.denominator > 1000000000n) {
      break;
    }
    if (term.abs().compareTo(epsilon) <= 0) {
      converged = true;
      break;
    }
  }
  if (converged && sum.denominator <= 1000000000n) {
    const errorBound = term.abs().multiply(new Rational(2));
    return new RationalInterval(sum.subtract(errorBound), sum.add(errorBound));
  } else {
    const xDecimal = x.toNumber();
    const arcsinDecimal = Math.asin(xDecimal);
    return createTightRationalInterval(arcsinDecimal, precision);
  }
}
function ARCCOS(x, precision) {
  const piOver2 = PI(precision).divide(new Rational(2));
  const arcsinX = ARCSIN(x, precision);
  return piOver2.subtract(arcsinX);
}
function TAN(x, precision) {
  const { epsilon } = parsePrecision(precision);
  if (x instanceof RationalInterval) {
    const samples = 100;
    let min = null, max = null;
    for (let i = 0;i <= samples; i++) {
      const t = x.low.add(x.high.subtract(x.low).multiply(new Rational(i)).divide(new Rational(samples)));
      try {
        const tanT = TAN(t, precision);
        if (min === null || tanT.low.compareTo(min) < 0)
          min = tanT.low;
        if (max === null || tanT.high.compareTo(max) > 0)
          max = tanT.high;
      } catch (e) {
        continue;
      }
    }
    if (min === null || max === null) {
      throw new Error("TAN: interval contains undefined points");
    }
    return new RationalInterval(min, max);
  }
  if (!(x instanceof Rational)) {
    x = new Rational(x);
  }
  const piInterval = PI(precision);
  const piApprox = piInterval.low.add(piInterval.high).divide(new Rational(2));
  const piOver2 = piApprox.divide(new Rational(2));
  const quotient = x.divide(piOver2);
  const nearestOddMultiple = round(quotient);
  if (Number(nearestOddMultiple.numerator % 2n) === 1) {
    const distance = quotient.subtract(nearestOddMultiple).abs();
    if (distance.compareTo(epsilon) < 0) {
      throw new Error("TAN: undefined at odd multiples of π/2");
    }
  }
  const sinX = SIN(x, precision);
  const cosX = COS(x, precision);
  if (cosX.low.abs().compareTo(epsilon) < 0 || cosX.high.abs().compareTo(epsilon) < 0) {
    throw new Error("TAN: undefined (cosine too close to zero)");
  }
  return sinX.divide(cosX);
}
function ARCTAN(x, precision) {
  const { epsilon } = parsePrecision(precision);
  if (x instanceof RationalInterval) {
    const lower = ARCTAN(x.low, precision);
    const upper = ARCTAN(x.high, precision);
    return new RationalInterval(lower.low, upper.high);
  }
  if (!(x instanceof Rational)) {
    x = new Rational(x);
  }
  if (isZero(x)) {
    return new RationalInterval(new Rational(0), new Rational(0));
  }
  const absX = x.abs();
  if (absX.compareTo(new Rational(1)) > 0) {
    const piOver2 = PI(precision).divide(new Rational(2));
    const piOver2Mid = piOver2.low.add(piOver2.high).divide(new Rational(2));
    const arctanRecip = ARCTAN(new Rational(1).divide(absX), precision);
    const result = piOver2Mid.subtract(arctanRecip.low.add(arctanRecip.high).divide(new Rational(2)));
    if (isNegative(x)) {
      return new RationalInterval(result.negate(), result.negate());
    } else {
      return new RationalInterval(result, result);
    }
  }
  let sum = x;
  let term = x;
  let n = 1;
  while (term.abs().compareTo(epsilon) > 0 && n < 100) {
    term = term.multiply(x).multiply(x).negate();
    const denominator = new Rational(2 * n + 1);
    sum = sum.add(term.divide(denominator));
    n++;
    if (sum.denominator > 100000000000n || term.denominator > 100000000000n) {
      break;
    }
  }
  const errorBound = term.abs().multiply(new Rational(2));
  return new RationalInterval(sum.subtract(errorBound), sum.add(errorBound));
}
function newtonRoot(q, n, precision) {
  const { epsilon } = parsePrecision(precision);
  if (!(q instanceof Rational)) {
    q = new Rational(q);
  }
  if (n <= 0) {
    throw new Error("Root degree must be positive");
  }
  if (n === 1) {
    return new RationalInterval(q, q);
  }
  if (isNegative(q) && n % 2 === 0) {
    throw new Error("Even root of negative number");
  }
  const qDecimal = q.toNumber();
  const initialGuess = Math.pow(qDecimal, 1 / n);
  let a = new Rational(Math.round(initialGuess * 1000), 1000);
  let iterations = 0;
  const maxIterations = 100;
  while (iterations < maxIterations) {
    let aPower = a;
    for (let i = 1;i < n - 1; i++) {
      aPower = aPower.multiply(a);
    }
    const b = q.divide(aPower);
    const diff = b.subtract(a).abs();
    if (diff.compareTo(epsilon) <= 0) {
      const lower = a.compareTo(b) < 0 ? a : b;
      const upper = a.compareTo(b) > 0 ? a : b;
      return new RationalInterval(lower, upper);
    }
    if (a.denominator > 100000000000n || b.denominator > 100000000000n) {
      const aDecimal = a.toNumber();
      const bDecimal = b.toNumber();
      if (!isNaN(aDecimal) && !isNaN(bDecimal)) {
        const lowerDecimal = Math.min(aDecimal, bDecimal);
        const upperDecimal = Math.max(aDecimal, bDecimal);
        const precisionScale = 1e7;
        const lowerRational = new Rational(Math.floor(lowerDecimal * precisionScale), precisionScale);
        const upperRational = new Rational(Math.ceil(upperDecimal * precisionScale), precisionScale);
        return new RationalInterval(lowerRational, upperRational);
      }
    }
    a = a.add(b.subtract(a).divide(new Rational(n)));
    iterations++;
  }
  throw new Error("Newton's method did not converge");
}
function rationalIntervalPower(base, exponent, precision) {
  if (exponent instanceof Integer) {
    exponent = exponent.toRational();
  } else if (typeof exponent === "bigint") {
    exponent = new Rational(exponent);
  } else if (typeof exponent === "number") {
    exponent = new Rational(exponent);
  }
  if (exponent instanceof Rational && exponent.denominator <= 10n) {
    const root = newtonRoot(base, Number(exponent.denominator), precision);
    if (exponent.numerator === 1n) {
      return root;
    }
    let result = root;
    const numeratorNum = Number(exponent.numerator);
    for (let i = 1;i < Math.abs(numeratorNum); i++) {
      result = result.multiply(root);
    }
    if (numeratorNum < 0) {
      return new RationalInterval(new Rational(1), new Rational(1)).divide(result);
    }
    return result;
  }
  const lnBase = LN(base, precision);
  const product = lnBase.multiply(exponent);
  if (product instanceof RationalInterval) {
    return EXP(product, precision);
  } else {
    return EXP(product, precision);
  }
}

// ../../packages/reals/src/ratmath-module.js
function getPrecision(context, prec) {
  if (prec !== undefined)
    return prec;
  if (context && context.variables) {
    let val;
    if (context.variables.has("_precision"))
      val = context.variables.get("_precision");
    else if (context.variables.has("PRECISION"))
      val = context.variables.get("PRECISION");
    if (val !== undefined) {
      if (val && val.toNumber)
        return val.toNumber();
      return val;
    }
  }
  return;
}
var functions = {
  PI: {
    type: "js",
    body: function(prec) {
      return PI(getPrecision(this, prec));
    },
    params: ["precision?"],
    doc: "Returns PI with optional precision (default: 10^-6 or env PRECISION)"
  },
  E: {
    type: "js",
    body: function(prec) {
      return E(getPrecision(this, prec));
    },
    params: ["precision?"],
    doc: "Returns e (Euler's number) with optional precision"
  },
  Exp: {
    type: "js",
    body: function(x, prec) {
      return EXP(x, getPrecision(this, prec));
    },
    params: ["x", "precision?"],
    doc: "Computes e^x with optional precision"
  },
  Ln: {
    type: "js",
    body: function(x, prec) {
      return LN(x, getPrecision(this, prec));
    },
    params: ["x", "precision?"],
    doc: "Computes natural logarithm of x"
  },
  Log: {
    type: "js",
    body: function(x, base, prec) {
      return LOG(x, base, getPrecision(this, prec));
    },
    params: ["x", "base", "precision?"],
    doc: "Computes logarithm of x base b"
  },
  Sin: {
    type: "js",
    body: function(x, prec) {
      return SIN(x, getPrecision(this, prec));
    },
    params: ["x", "precision?"],
    doc: "Computes sine of x (radians)"
  },
  Cos: {
    type: "js",
    body: function(x, prec) {
      return COS(x, getPrecision(this, prec));
    },
    params: ["x", "precision?"],
    doc: "Computes cosine of x (radians)"
  },
  Tan: {
    type: "js",
    body: function(x, prec) {
      return TAN(x, getPrecision(this, prec));
    },
    params: ["x", "precision?"],
    doc: "Computes tangent of x (radians)"
  },
  Arcsin: {
    type: "js",
    body: function(x, prec) {
      return ARCSIN(x, getPrecision(this, prec));
    },
    params: ["x", "precision?"],
    doc: "Computes inverse sine of x"
  },
  Arccos: {
    type: "js",
    body: function(x, prec) {
      return ARCCOS(x, getPrecision(this, prec));
    },
    params: ["x", "precision?"],
    doc: "Computes inverse cosine of x"
  },
  Arctan: {
    type: "js",
    body: function(x, prec) {
      return ARCTAN(x, getPrecision(this, prec));
    },
    params: ["x", "precision?"],
    doc: "Computes inverse tangent of x"
  },
  Root: {
    type: "js",
    body: function(q, n, prec) {
      return newtonRoot(q, n, getPrecision(this, prec));
    },
    params: ["q", "n", "precision?"],
    doc: "Computes nth root of q using Newton's method"
  },
  Pow: {
    type: "js",
    body: function(base, exp, prec) {
      return rationalIntervalPower(base, exp, getPrecision(this, prec));
    },
    params: ["base", "exponent", "precision?"],
    doc: "Computes base^exponent (supports fractional exponents)"
  }
};
var variables = {};
export {
  functions,
  variables
};
