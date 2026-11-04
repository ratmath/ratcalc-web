var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// ../../packages/core/index.js
var exports_core = {};
__export(exports_core, {
  BaseSystem: () => BaseSystem,
  CertifiedApproximation: () => CertifiedApproximation,
  Fraction: () => Fraction,
  FractionInterval: () => FractionInterval,
  Integer: () => Integer,
  NUMERAL_LIMITS: () => NUMERAL_LIMITS,
  NUMERAL_SYSTEM_SCHEMA: () => NUMERAL_SYSTEM_SCHEMA,
  NumeralSystem: () => NumeralSystem,
  R: () => R,
  RANGE_ARITHMETIC_CHECKER_ID: () => RANGE_ARITHMETIC_CHECKER_ID,
  RANGE_OPERATION_RESULT_SCHEMA: () => RANGE_OPERATION_RESULT_SCHEMA,
  Rational: () => Rational,
  RationalInterval: () => RationalInterval,
  RationalIntervalSet: () => RationalIntervalSet,
  Relation: () => Relation,
  TypePromotion: () => TypePromotion,
  asRationalIntervalSet: () => asRationalIntervalSet,
  boundedContinuedFractionApproximation: () => boundedContinuedFractionApproximation,
  boundedDecimalApproximation: () => boundedDecimalApproximation,
  certifiedContinuedFractionPrefix: () => certifiedContinuedFractionPrefix,
  certifiedRadixPrefix: () => certifiedRadixPrefix,
  checkRangeOperationResult: () => checkRangeOperationResult,
  default: () => core_default,
  isBaseSystem: () => isBaseSystem,
  isCertifiedApproximation: () => isCertifiedApproximation,
  isCoreNumber: () => isCoreNumber,
  isFraction: () => isFraction,
  isFractionInterval: () => isFractionInterval,
  isInteger: () => isInteger,
  isRational: () => isRational,
  isRationalInterval: () => isRationalInterval,
  isRationalIntervalSet: () => isRationalIntervalSet,
  normalizeCertifiedApproximation: () => normalizeCertifiedApproximation,
  parseCertifiedApproximation: () => parseApproximation,
  parseContinuedFraction: () => parseContinuedFraction,
  parseDecimal: () => parseDecimal,
  parseInterval: () => parseInterval,
  parseMixedNumber: () => parseMixedNumber,
  parseNumber: () => parseNumber,
  parseRational: () => parseRational,
  parseRepeatingDecimal: () => parseRepeatingDecimal,
  possibleRelations: () => possibleRelations,
  rangeAbsoluteValue: () => rangeAbsoluteValue,
  rangeAdd: () => rangeAdd,
  rangeDivide: () => rangeDivide,
  rangeIntegerPower: () => rangeIntegerPower,
  rangeMultiply: () => rangeMultiply,
  rangeNegate: () => rangeNegate,
  rangeReciprocal: () => rangeReciprocal,
  rangeSubtract: () => rangeSubtract,
  reviveCoreValue: () => reviveCoreValue
});

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

// ../../packages/core/src/rational-interval-set.js
function asRational(value, name) {
  if (value === null)
    return null;
  if (value === undefined) {
    throw new TypeError(`${name} endpoint is required; use null for infinity`);
  }
  return value instanceof Rational ? value : new Rational(value);
}
function compareFinite(left, right) {
  if (left.lessThan(right))
    return -1;
  if (left.greaterThan(right))
    return 1;
  return 0;
}
function compareLow(left, right) {
  if (left === null)
    return right === null ? 0 : -1;
  if (right === null)
    return 1;
  return compareFinite(left, right);
}
function compareHigh(left, right) {
  if (left === null)
    return right === null ? 0 : 1;
  if (right === null)
    return -1;
  return compareFinite(left, right);
}
function freezeComponent(component) {
  return Object.freeze(component);
}
function normalizeComponent(input) {
  if (input instanceof RationalInterval) {
    return freezeComponent({
      low: input.low,
      high: input.high,
      lowClosed: true,
      highClosed: true
    });
  }
  if (!input || typeof input !== "object") {
    throw new TypeError("Interval-set components must be interval objects");
  }
  const low = asRational(input.low, "Low");
  const high = asRational(input.high, "High");
  const lowClosed = input.lowClosed ?? low !== null;
  const highClosed = input.highClosed ?? high !== null;
  if (typeof lowClosed !== "boolean" || typeof highClosed !== "boolean") {
    throw new TypeError("Endpoint closure flags must be booleans");
  }
  if (low === null && lowClosed) {
    throw new RangeError("-Infinity cannot be a closed endpoint");
  }
  if (high === null && highClosed) {
    throw new RangeError("+Infinity cannot be a closed endpoint");
  }
  if (low !== null && high !== null) {
    const order = compareFinite(low, high);
    if (order > 0)
      throw new RangeError("Interval-set low endpoint exceeds high endpoint");
    if (order === 0 && !(lowClosed && highClosed))
      return null;
  }
  return freezeComponent({ low, high, lowClosed, highClosed });
}
function componentsJoin(left, right) {
  if (right.low === null)
    return true;
  if (left.high === null)
    return true;
  const order = compareFinite(left.high, right.low);
  return order > 0 || order === 0 && (left.highClosed || right.lowClosed);
}
function mergeComponents(left, right) {
  let high;
  let highClosed;
  const highOrder = compareHigh(left.high, right.high);
  if (highOrder > 0) {
    high = left.high;
    highClosed = left.highClosed;
  } else if (highOrder < 0) {
    high = right.high;
    highClosed = right.highClosed;
  } else {
    high = left.high;
    highClosed = left.high === null ? false : left.highClosed || right.highClosed;
  }
  const sameLow = compareLow(left.low, right.low) === 0;
  return freezeComponent({
    low: left.low,
    high,
    lowClosed: left.low === null ? false : left.lowClosed || sameLow && right.lowClosed,
    highClosed
  });
}
function normalizeComponents(inputs) {
  const sorted = inputs.map(normalizeComponent).filter((component) => component !== null).sort((left, right) => {
    const byLow = compareLow(left.low, right.low);
    if (byLow !== 0)
      return byLow;
    if (left.lowClosed !== right.lowClosed)
      return left.lowClosed ? -1 : 1;
    return compareHigh(right.high, left.high);
  });
  const result = [];
  for (const component of sorted) {
    const previous = result.at(-1);
    if (!previous || !componentsJoin(previous, component)) {
      result.push(component);
    } else {
      result[result.length - 1] = mergeComponents(previous, component);
    }
  }
  return Object.freeze(result);
}
function componentContainsValue(component, value) {
  const aboveLow = component.low === null || component.low.lessThan(value) || component.low.equals(value) && component.lowClosed;
  const belowHigh = component.high === null || component.high.greaterThan(value) || component.high.equals(value) && component.highClosed;
  return aboveLow && belowHigh;
}
function componentContainsComponent(outer, inner) {
  let lowerContained;
  if (outer.low === null) {
    lowerContained = true;
  } else if (inner.low === null) {
    lowerContained = false;
  } else {
    const order = compareFinite(outer.low, inner.low);
    lowerContained = order < 0 || order === 0 && (outer.lowClosed || !inner.lowClosed);
  }
  let upperContained;
  if (outer.high === null) {
    upperContained = true;
  } else if (inner.high === null) {
    upperContained = false;
  } else {
    const order = compareFinite(outer.high, inner.high);
    upperContained = order > 0 || order === 0 && (outer.highClosed || !inner.highClosed);
  }
  return lowerContained && upperContained;
}
function intersectionComponent(left, right) {
  let low;
  let lowClosed;
  const lowOrder = compareLow(left.low, right.low);
  if (lowOrder > 0) {
    low = left.low;
    lowClosed = left.lowClosed;
  } else if (lowOrder < 0) {
    low = right.low;
    lowClosed = right.lowClosed;
  } else {
    low = left.low;
    lowClosed = low === null ? false : left.lowClosed && right.lowClosed;
  }
  let high;
  let highClosed;
  const highOrder = compareHigh(left.high, right.high);
  if (highOrder < 0) {
    high = left.high;
    highClosed = left.highClosed;
  } else if (highOrder > 0) {
    high = right.high;
    highClosed = right.highClosed;
  } else {
    high = left.high;
    highClosed = high === null ? false : left.highClosed && right.highClosed;
  }
  if (low !== null && high !== null) {
    const order = compareFinite(low, high);
    if (order > 0 || order === 0 && !(lowClosed && highClosed))
      return null;
  }
  return freezeComponent({ low, high, lowClosed, highClosed });
}
function asIntervalSet(value) {
  if (value instanceof RationalIntervalSet)
    return value;
  return new RationalIntervalSet(value);
}
function formatEndpoint(value, negative) {
  if (value === null)
    return negative ? "-inf" : "inf";
  return value.toString();
}

class RationalIntervalSet {
  #components;
  static empty = Object.freeze(new RationalIntervalSet);
  static allReals = Object.freeze(new RationalIntervalSet({
    low: null,
    high: null,
    lowClosed: false,
    highClosed: false
  }));
  constructor(components = []) {
    if (components instanceof RationalIntervalSet) {
      this.#components = components.#components;
      return;
    }
    const inputs = Array.isArray(components) ? components : [components];
    this.#components = normalizeComponents(inputs);
  }
  get components() {
    return this.#components;
  }
  get isEmpty() {
    return this.#components.length === 0;
  }
  get isConnected() {
    return this.#components.length <= 1;
  }
  get isBounded() {
    return this.isEmpty || this.#components[0].low !== null && this.#components.at(-1).high !== null;
  }
  get componentCount() {
    return this.#components.length;
  }
  containsValue(value) {
    const rational = value instanceof Rational ? value : new Rational(value);
    return this.#components.some((component) => componentContainsValue(component, rational));
  }
  contains(other) {
    const set = asIntervalSet(other);
    return set.#components.every((inner) => this.#components.some((outer) => componentContainsComponent(outer, inner)));
  }
  equals(other) {
    const set = asIntervalSet(other);
    if (this.componentCount !== set.componentCount)
      return false;
    return this.#components.every((left, index) => {
      const right = set.#components[index];
      return compareLow(left.low, right.low) === 0 && compareHigh(left.high, right.high) === 0 && left.lowClosed === right.lowClosed && left.highClosed === right.highClosed;
    });
  }
  union(other) {
    const set = asIntervalSet(other);
    return new RationalIntervalSet([...this.#components, ...set.#components]);
  }
  intersection(other) {
    const set = asIntervalSet(other);
    const intersections = [];
    let leftIndex = 0;
    let rightIndex = 0;
    while (leftIndex < this.componentCount && rightIndex < set.componentCount) {
      const left = this.#components[leftIndex];
      const right = set.#components[rightIndex];
      const component = intersectionComponent(left, right);
      if (component)
        intersections.push(component);
      const endOrder = compareHigh(left.high, right.high);
      if (endOrder <= 0)
        leftIndex += 1;
      if (endOrder >= 0)
        rightIndex += 1;
    }
    return new RationalIntervalSet(intersections);
  }
  hull() {
    if (this.isEmpty)
      return RationalIntervalSet.empty;
    const first = this.#components[0];
    const last = this.#components.at(-1);
    return new RationalIntervalSet({
      low: first.low,
      high: last.high,
      lowClosed: first.lowClosed,
      highClosed: last.highClosed
    });
  }
  toRationalInterval() {
    if (this.componentCount !== 1)
      return null;
    const component = this.#components[0];
    if (component.low === null || component.high === null || !component.lowClosed || !component.highClosed)
      return null;
    return new RationalInterval(component.low, component.high);
  }
  toString() {
    if (this.isEmpty)
      return "empty";
    return this.#components.map((component) => {
      const left = component.lowClosed ? "[" : "(";
      const right = component.highClosed ? "]" : ")";
      return `${left}${formatEndpoint(component.low, true)},${formatEndpoint(component.high, false)}${right}`;
    }).join(" U ");
  }
  toJSON() {
    return {
      $ratmath: "RationalIntervalSet",
      version: 1,
      components: this.#components.map((component) => ({ ...component }))
    };
  }
  static point(value) {
    const rational = value instanceof Rational ? value : new Rational(value);
    return new RationalIntervalSet({
      low: rational,
      high: rational,
      lowClosed: true,
      highClosed: true
    });
  }
  static fromInterval(interval) {
    if (!(interval instanceof RationalInterval)) {
      throw new TypeError("Expected a RationalInterval");
    }
    return new RationalIntervalSet(interval);
  }
}

// ../../packages/core/src/range-arithmetic.js
var ZERO = Rational.zero;
var ONE = Rational.one;
var RESULT_SCHEMA = "ratmath.range-operation-result@1";
var CHECKER_ID = "ratmath.core.range-arithmetic@1";
function isScalarInput(value) {
  return value instanceof Rational || value?.constructor?.name === "Integer" || typeof value === "number" || typeof value === "bigint" || typeof value === "string";
}
function asRationalIntervalSet(value) {
  if (value instanceof RationalIntervalSet)
    return value;
  if (value instanceof RationalInterval)
    return RationalIntervalSet.fromInterval(value);
  if (isScalarInput(value)) {
    return RationalIntervalSet.point(value?.constructor?.name === "Integer" ? value.value : value);
  }
  return new RationalIntervalSet(value);
}
function exactInteger(value, label = "Exponent") {
  if (typeof value === "bigint")
    return value;
  if (typeof value === "number" && Number.isSafeInteger(value))
    return BigInt(value);
  if (typeof value === "string") {
    const rational = new Rational(value);
    if (rational.denominator === 1n)
      return rational.numerator;
  }
  if (value?.constructor?.name === "Integer")
    return value.value;
  if (value instanceof Rational && value.denominator === 1n)
    return value.numerator;
  throw new TypeError(`${label} must be an exact integer`);
}
function negateComponent(component) {
  return {
    low: component.high === null ? null : component.high.negate(),
    high: component.low === null ? null : component.low.negate(),
    lowClosed: component.high === null ? false : component.highClosed,
    highClosed: component.low === null ? false : component.lowClosed
  };
}
function addComponents(left, right) {
  const low = left.low === null || right.low === null ? null : left.low.add(right.low);
  const high = left.high === null || right.high === null ? null : left.high.add(right.high);
  return {
    low,
    high,
    lowClosed: low === null ? false : left.lowClosed && right.lowClosed,
    highClosed: high === null ? false : left.highClosed && right.highClosed
  };
}
function containsZeroComponent(component) {
  const aboveLow = component.low === null || component.low.lessThan(ZERO) || component.low.equals(ZERO) && component.lowClosed;
  const belowHigh = component.high === null || component.high.greaterThan(ZERO) || component.high.equals(ZERO) && component.highClosed;
  return aboveLow && belowHigh;
}
function hasPositiveValue(component) {
  return component.high === null || component.high.greaterThan(ZERO);
}
function nonnegativeProductComponent(left, right) {
  const low = left.low.multiply(right.low);
  const lowClosed = low.equals(ZERO) ? containsZeroComponent(left) || containsZeroComponent(right) : left.lowClosed && right.lowClosed;
  const unbounded = left.high === null && hasPositiveValue(right) || right.high === null && hasPositiveValue(left);
  if (unbounded) {
    return { low, high: null, lowClosed, highClosed: false };
  }
  if (left.high === null || right.high === null) {
    return { low: ZERO, high: ZERO, lowClosed: true, highClosed: true };
  }
  const high = left.high.multiply(right.high);
  return {
    low,
    high,
    lowClosed,
    highClosed: high.equals(ZERO) ? true : left.highClosed && right.highClosed
  };
}
function nonpositiveToNonnegative(component) {
  return negateComponent(component);
}
function splitBySign(set, includeZero) {
  const negative = set.intersection({
    low: null,
    high: ZERO,
    lowClosed: false,
    highClosed: includeZero
  });
  const positive = set.intersection({
    low: ZERO,
    high: null,
    lowClosed: includeZero,
    highClosed: false
  });
  return { negative, positive };
}
function withoutZero(set) {
  const { negative, positive } = splitBySign(set, false);
  return negative.union(positive);
}
function multiplySets(left, right) {
  const leftSigns = splitBySign(left, true);
  const rightSigns = splitBySign(right, true);
  const components = [];
  const appendPositiveProducts = (leftSet, rightSet, negate = false) => {
    for (const a of leftSet.components) {
      for (const b of rightSet.components) {
        const product = nonnegativeProductComponent(a, b);
        components.push(negate ? negateComponent(product) : product);
      }
    }
  };
  const leftNegativeMagnitude = new RationalIntervalSet(leftSigns.negative.components.map(nonpositiveToNonnegative));
  const rightNegativeMagnitude = new RationalIntervalSet(rightSigns.negative.components.map(nonpositiveToNonnegative));
  appendPositiveProducts(leftSigns.positive, rightSigns.positive);
  appendPositiveProducts(leftNegativeMagnitude, rightNegativeMagnitude);
  appendPositiveProducts(leftNegativeMagnitude, rightSigns.positive, true);
  appendPositiveProducts(leftSigns.positive, rightNegativeMagnitude, true);
  return new RationalIntervalSet(components);
}
function reciprocalPositiveComponent(component) {
  const low = component.high === null ? ZERO : component.high.reciprocal();
  const high = component.low.equals(ZERO) ? null : component.low.reciprocal();
  return {
    low,
    high,
    lowClosed: component.high === null ? false : component.highClosed,
    highClosed: high === null ? false : component.lowClosed
  };
}
function reciprocalNegativeComponent(component) {
  const low = component.high.equals(ZERO) ? null : component.high.reciprocal();
  const high = component.low === null ? ZERO : component.low.reciprocal();
  return {
    low,
    high,
    lowClosed: low === null ? false : component.highClosed,
    highClosed: component.low === null ? false : component.lowClosed
  };
}
function reciprocalSet(set) {
  const { negative, positive } = splitBySign(set, false);
  return new RationalIntervalSet([
    ...negative.components.map(reciprocalNegativeComponent),
    ...positive.components.map(reciprocalPositiveComponent)
  ]);
}
function positiveIntegerPowerSet(set, exponent) {
  if (exponent <= 0n)
    throw new RangeError("Positive power helper requires exponent > 0");
  const odd = (exponent & 1n) === 1n;
  const source = odd ? set : absoluteSet(set);
  return new RationalIntervalSet(source.components.map((component) => ({
    low: component.low === null ? null : component.low.pow(exponent),
    high: component.high === null ? null : component.high.pow(exponent),
    lowClosed: component.low === null ? false : component.lowClosed,
    highClosed: component.high === null ? false : component.highClosed
  })));
}
function absoluteSet(set) {
  const { negative, positive } = splitBySign(set, true);
  return new RationalIntervalSet([
    ...negative.components.map(negateComponent),
    ...positive.components
  ]);
}
function unaryCoverage(set, definedInput) {
  if (set.isEmpty)
    return "allDefined";
  if (definedInput.equals(set))
    return "allDefined";
  if (definedInput.isEmpty)
    return "noDefinedInputs";
  return "partiallyDefined";
}
function freezeExclusion(exclusion) {
  return Object.freeze({ ...exclusion });
}
function domainRecord(coverage, options = {}) {
  return Object.freeze({
    coverage,
    ...options.definedInput ? { definedInput: options.definedInput } : {},
    exclusions: Object.freeze((options.exclusions || []).map(freezeExclusion))
  });
}
function operationResult(operation, operands, range, domain, parameters = {}) {
  return Object.freeze({
    schema: RESULT_SCHEMA,
    operation: `rix.core.range.${operation}@1`,
    operands: Object.freeze([...operands]),
    parameters: Object.freeze({ ...parameters }),
    range,
    domain,
    certified: true,
    evidenceLevel: "checkedEvidence",
    evidence: Object.freeze({
      schema: "rix.numerics.range-evidence-node@1",
      rule: `arith.${operation}`,
      checkedBy: CHECKER_ID
    })
  });
}
function totalDomain() {
  return domainRecord("allDefined");
}
function rangeNegate(value) {
  const input = asRationalIntervalSet(value);
  const range = new RationalIntervalSet(input.components.map(negateComponent));
  return operationResult("negate", [input], range, totalDomain());
}
function rangeAbsoluteValue(value) {
  const input = asRationalIntervalSet(value);
  return operationResult("absoluteValue", [input], absoluteSet(input), totalDomain());
}
function rangeAdd(leftValue, rightValue) {
  const left = asRationalIntervalSet(leftValue);
  const right = asRationalIntervalSet(rightValue);
  const components = [];
  for (const a of left.components) {
    for (const b of right.components)
      components.push(addComponents(a, b));
  }
  return operationResult("add", [left, right], new RationalIntervalSet(components), totalDomain());
}
function rangeSubtract(leftValue, rightValue) {
  const left = asRationalIntervalSet(leftValue);
  const right = asRationalIntervalSet(rightValue);
  const negated = new RationalIntervalSet(right.components.map(negateComponent));
  const components = [];
  for (const a of left.components) {
    for (const b of negated.components)
      components.push(addComponents(a, b));
  }
  return operationResult("subtract", [left, right], new RationalIntervalSet(components), totalDomain());
}
function rangeMultiply(leftValue, rightValue) {
  const left = asRationalIntervalSet(leftValue);
  const right = asRationalIntervalSet(rightValue);
  return operationResult("multiply", [left, right], multiplySets(left, right), totalDomain());
}
function rangeReciprocal(value) {
  const input = asRationalIntervalSet(value);
  const definedInput = withoutZero(input);
  const hasExcludedZero = input.containsValue(ZERO);
  const exclusions = hasExcludedZero ? [{ reason: "divisionByZero", operand: 1, excludedSet: RationalIntervalSet.point(ZERO) }] : [];
  const domain = domainRecord(unaryCoverage(input, definedInput), {
    definedInput,
    exclusions
  });
  return operationResult("reciprocal", [input], reciprocalSet(definedInput), domain);
}
function rangeDivide(leftValue, rightValue) {
  const left = asRationalIntervalSet(leftValue);
  const right = asRationalIntervalSet(rightValue);
  const definedRight = withoutZero(right);
  let coverage = "allDefined";
  if (!left.isEmpty && !right.isEmpty && right.containsValue(ZERO)) {
    coverage = definedRight.isEmpty ? "noDefinedInputs" : "partiallyDefined";
  }
  const exclusions = coverage === "allDefined" ? [] : [{ reason: "divisionByZero", operand: 2, excludedSet: RationalIntervalSet.point(ZERO) }];
  const domain = domainRecord(coverage, { exclusions });
  const range = multiplySets(left, reciprocalSet(definedRight));
  return operationResult("divide", [left, right], range, domain);
}
function rangeIntegerPower(value, exponentValue, options = {}) {
  const input = asRationalIntervalSet(value);
  const exponent = exactInteger(exponentValue);
  const zeroPowerZero = options.zeroPowerZero ?? "undefined";
  if (zeroPowerZero !== "undefined" && zeroPowerZero !== "one") {
    throw new TypeError("zeroPowerZero must be 'undefined' or 'one'");
  }
  if (exponent > 0n) {
    return operationResult("integerPower", [input], positiveIntegerPowerSet(input, exponent), totalDomain(), { exponent, zeroPowerZero });
  }
  if (exponent === 0n && zeroPowerZero === "one") {
    const range = input.isEmpty ? RationalIntervalSet.empty : RationalIntervalSet.point(ONE);
    return operationResult("integerPower", [input], range, totalDomain(), { exponent, zeroPowerZero });
  }
  const definedInput = withoutZero(input);
  const hasExcludedZero = input.containsValue(ZERO);
  const exclusions = hasExcludedZero ? [{
    reason: exponent === 0n ? "zeroPowerZero" : "zeroToNegativePower",
    operand: 1,
    excludedSet: RationalIntervalSet.point(ZERO)
  }] : [];
  const domain = domainRecord(unaryCoverage(input, definedInput), {
    definedInput,
    exclusions
  });
  let range;
  if (exponent === 0n) {
    range = definedInput.isEmpty ? RationalIntervalSet.empty : RationalIntervalSet.point(ONE);
  } else {
    range = reciprocalSet(positiveIntegerPowerSet(definedInput, -exponent));
  }
  return operationResult("integerPower", [input], range, domain, { exponent, zeroPowerZero });
}
function operationName(value) {
  const match = /^rix\.core\.range\.([A-Za-z]+)@1$/.exec(value || "");
  return match?.[1] ?? null;
}
function recompute(operation, operands, parameters) {
  switch (operation) {
    case "negate":
      return rangeNegate(operands[0]);
    case "absoluteValue":
      return rangeAbsoluteValue(operands[0]);
    case "add":
      return rangeAdd(operands[0], operands[1]);
    case "subtract":
      return rangeSubtract(operands[0], operands[1]);
    case "multiply":
      return rangeMultiply(operands[0], operands[1]);
    case "reciprocal":
      return rangeReciprocal(operands[0]);
    case "divide":
      return rangeDivide(operands[0], operands[1]);
    case "integerPower":
      return rangeIntegerPower(operands[0], parameters.exponent, { zeroPowerZero: parameters.zeroPowerZero });
    default:
      return null;
  }
}
function sameExclusions(left, right) {
  if (left.length !== right.length)
    return false;
  return left.every((entry, index) => {
    const other = right[index];
    return entry.reason === other.reason && entry.operand === other.operand && entry.excludedSet.equals(other.excludedSet);
  });
}
function checkRangeOperationResult(candidate, expected = {}) {
  if (!candidate || candidate.schema !== RESULT_SCHEMA) {
    return Object.freeze({ accepted: false, reason: "unsupportedSchema", checkedBy: CHECKER_ID });
  }
  const operation = expected.operation ?? operationName(candidate.operation);
  const operands = expected.operands ?? candidate.operands;
  const parameters = expected.parameters ?? candidate.parameters ?? {};
  const recomputed = recompute(operation, operands, parameters);
  if (!recomputed) {
    return Object.freeze({ accepted: false, reason: "unsupportedRule", checkedBy: CHECKER_ID });
  }
  const accepted = candidate.range instanceof RationalIntervalSet && candidate.range.equals(recomputed.range) && candidate.domain?.coverage === recomputed.domain.coverage && sameExclusions(candidate.domain?.exclusions || [], recomputed.domain.exclusions);
  return Object.freeze({
    accepted,
    reason: accepted ? null : "claimMismatch",
    checkedBy: CHECKER_ID,
    operation,
    domainCoverage: recomputed.domain.coverage
  });
}
var RANGE_OPERATION_RESULT_SCHEMA = RESULT_SCHEMA;
var RANGE_ARITHMETIC_CHECKER_ID = CHECKER_ID;

// ../../packages/core/src/fraction.js
class Fraction {
  #numerator;
  #denominator;
  static DEFAULT_STERN_BROCOT_PATH_LIMIT = 500;
  constructor(numerator, denominator = 1n, options = {}) {
    if (typeof numerator === "string") {
      const parts = numerator.trim().split("/");
      if (parts.length === 1) {
        this.#numerator = BigInt(parts[0]);
        this.#denominator = toExactBigInt(denominator, "Fraction denominator");
      } else if (parts.length === 2) {
        this.#numerator = BigInt(parts[0]);
        this.#denominator = BigInt(parts[1]);
      } else {
        throw new Error("Invalid fraction format. Use 'a/b' or 'a'");
      }
    } else {
      this.#numerator = toExactBigInt(numerator, "Fraction numerator");
      this.#denominator = toExactBigInt(denominator, "Fraction denominator");
    }
    if (this.#denominator === 0n) {
      if (this.#numerator === 0n) {
        throw new Error("The indeterminate fraction 0/0 is not allowed");
      }
      if (options.allowInfinite) {
        this._isInfinite = true;
      } else {
        throw new Error("Denominator cannot be zero unless allowInfinite is true");
      }
    } else {
      this._isInfinite = false;
    }
  }
  get numerator() {
    return this.#numerator;
  }
  get denominator() {
    return this.#denominator;
  }
  get isInfinite() {
    return this._isInfinite || false;
  }
  static #fromComponents(numerator, denominator) {
    return new Fraction(numerator, denominator, {
      allowInfinite: denominator === 0n
    });
  }
  add(other) {
    if (this.#denominator !== other.denominator) {
      throw new Error("Addition only supported for equal denominators");
    }
    return Fraction.#fromComponents(this.#numerator + other.numerator, this.#denominator);
  }
  subtract(other) {
    if (this.#denominator !== other.denominator) {
      throw new Error("Subtraction only supported for equal denominators");
    }
    return Fraction.#fromComponents(this.#numerator - other.numerator, this.#denominator);
  }
  multiply(other) {
    return Fraction.#fromComponents(this.#numerator * other.numerator, this.#denominator * other.denominator);
  }
  divide(other) {
    if (other.numerator === 0n) {
      throw new Error("Division by zero");
    }
    return Fraction.#fromComponents(this.#numerator * other.denominator, this.#denominator * other.numerator);
  }
  pow(exponent) {
    const n = toExactBigInt(exponent, "Exponent");
    if (n === 0n) {
      if (this.#numerator === 0n) {
        throw new Error("Zero cannot be raised to the power of zero");
      }
      return new Fraction(1, 1);
    }
    if (this.#numerator === 0n && n < 0n) {
      throw new Error("Zero cannot be raised to a negative power");
    }
    if (n < 0n) {
      return Fraction.#fromComponents(this.#denominator ** -n, this.#numerator ** -n);
    }
    return Fraction.#fromComponents(this.#numerator ** n, this.#denominator ** n);
  }
  scale(factor) {
    const scaleFactor = toExactBigInt(factor, "Fraction scale factor");
    return Fraction.#fromComponents(this.#numerator * scaleFactor, this.#denominator * scaleFactor);
  }
  static #gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
  static #compareValues(left, right) {
    if (left.isInfinite && right.isInfinite) {
      const leftSign = left.numerator < 0n ? -1 : 1;
      const rightSign = right.numerator < 0n ? -1 : 1;
      return leftSign < rightSign ? -1 : leftSign > rightSign ? 1 : 0;
    }
    if (left.isInfinite) {
      return left.numerator < 0n ? -1 : 1;
    }
    if (right.isInfinite) {
      return right.numerator < 0n ? 1 : -1;
    }
    let leftNumerator = left.numerator;
    let leftDenominator = left.denominator;
    let rightNumerator = right.numerator;
    let rightDenominator = right.denominator;
    if (leftDenominator < 0n) {
      leftNumerator = -leftNumerator;
      leftDenominator = -leftDenominator;
    }
    if (rightDenominator < 0n) {
      rightNumerator = -rightNumerator;
      rightDenominator = -rightDenominator;
    }
    const leftProduct = leftNumerator * rightDenominator;
    const rightProduct = rightNumerator * leftDenominator;
    return leftProduct < rightProduct ? -1 : leftProduct > rightProduct ? 1 : 0;
  }
  static #modInverse(value, modulus) {
    let oldR = (value % modulus + modulus) % modulus;
    let r = modulus;
    let oldS = 1n;
    let s = 0n;
    while (r !== 0n) {
      const quotient = oldR / r;
      [oldR, r] = [r, oldR - quotient * r];
      [oldS, s] = [s, oldS - quotient * s];
    }
    if (oldR !== 1n) {
      throw new Error("A modular inverse does not exist");
    }
    return (oldS % modulus + modulus) % modulus;
  }
  reduce() {
    if (this.isInfinite) {
      return new Fraction(this.#numerator < 0n ? -1n : 1n, 0n, {
        allowInfinite: true
      });
    }
    if (this.#numerator === 0n) {
      return new Fraction(0, 1);
    }
    const gcd = Fraction.#gcd(this.#numerator, this.#denominator);
    const reducedNum = this.#numerator / gcd;
    const reducedDen = this.#denominator / gcd;
    if (reducedDen < 0n) {
      return new Fraction(-reducedNum, -reducedDen);
    }
    return Fraction.#fromComponents(reducedNum, reducedDen);
  }
  static mediant(a, b) {
    return a.mediant(b);
  }
  toRational() {
    if (this.isInfinite) {
      throw new Error("Cannot convert an infinite Fraction to Rational");
    }
    return new Rational(this.#numerator, this.#denominator);
  }
  static fromRational(rational) {
    return new Fraction(rational.numerator, rational.denominator);
  }
  toString() {
    if (this.#denominator === 1n) {
      return this.#numerator.toString();
    }
    return `${this.#numerator}/${this.#denominator}`;
  }
  equals(other) {
    return this.#numerator === other.numerator && this.#denominator === other.denominator;
  }
  lessThan(other) {
    return Fraction.#compareValues(this, other) < 0;
  }
  lessThanOrEqual(other) {
    return Fraction.#compareValues(this, other) <= 0;
  }
  greaterThan(other) {
    return Fraction.#compareValues(this, other) > 0;
  }
  greaterThanOrEqual(other) {
    return Fraction.#compareValues(this, other) >= 0;
  }
  E(exponent) {
    const exp = toExactBigInt(exponent, "Exponent");
    if (exp >= 0n) {
      const newNumerator = this.#numerator * 10n ** exp;
      return Fraction.#fromComponents(newNumerator, this.#denominator);
    } else {
      const newDenominator = this.#denominator * 10n ** -exp;
      return Fraction.#fromComponents(this.#numerator, newDenominator);
    }
  }
  toJSON() {
    return {
      $ratmath: "Fraction",
      numerator: this.#numerator.toString(),
      denominator: this.#denominator.toString()
    };
  }
  mediant(other) {
    if (this.isInfinite && other.isInfinite) {
      if (this.#numerator === -1n && other.numerator === 1n) {
        return new Fraction(0n, 1n);
      } else if (this.#numerator === 1n && other.numerator === -1n) {
        return new Fraction(0n, 1n);
      }
      throw new Error("Cannot compute mediant of two infinite fractions");
    }
    if (this.isInfinite || other.isInfinite) {
      const newNum = this.#numerator + other.numerator;
      const newDen = this.#denominator + other.denominator;
      if (newNum === 0n && newDen === 0n) {
        throw new Error("Mediant would result in 0/0");
      }
      return Fraction.#fromComponents(newNum, newDen);
    }
    const newNum = this.#numerator + other.numerator;
    const newDen = this.#denominator + other.denominator;
    return Fraction.#fromComponents(newNum, newDen);
  }
  fareyParents() {
    if (this.isInfinite) {
      throw new Error("Cannot find Farey parents of infinite fraction");
    }
    const normalizedNumerator = this.#denominator < 0n ? -this.#numerator : this.#numerator;
    const normalizedDenominator = this.#denominator < 0n ? -this.#denominator : this.#denominator;
    const scale = Fraction.#gcd(normalizedNumerator, normalizedDenominator);
    const reducedNumerator = normalizedNumerator / scale;
    const reducedDenominator = normalizedDenominator / scale;
    if (reducedNumerator === 0n) {
      if (scale === 1n) {
        return {
          left: new Fraction(-1n, 0n, { allowInfinite: true }),
          right: new Fraction(1n, 0n, { allowInfinite: true })
        };
      }
      const leftDenominator = scale / 2n;
      return {
        left: new Fraction(-1n, leftDenominator),
        right: new Fraction(1n, scale - leftDenominator)
      };
    }
    let leftNumerator;
    let leftDenominator;
    let rightNumerator;
    let rightDenominator;
    if (reducedDenominator === 1n) {
      if (reducedNumerator > 0n) {
        leftNumerator = reducedNumerator - 1n;
        leftDenominator = 1n;
        rightNumerator = 1n;
        rightDenominator = 0n;
      } else {
        leftNumerator = -1n;
        leftDenominator = 0n;
        rightNumerator = reducedNumerator + 1n;
        rightDenominator = 1n;
      }
    } else {
      leftDenominator = Fraction.#modInverse(reducedNumerator, reducedDenominator);
      leftNumerator = (reducedNumerator * leftDenominator - 1n) / reducedDenominator;
      rightNumerator = reducedNumerator - leftNumerator;
      rightDenominator = reducedDenominator - leftDenominator;
    }
    let leftCopies = (scale * reducedDenominator - 2n * leftDenominator + reducedDenominator) / (2n * reducedDenominator);
    if (leftCopies < 0n) {
      leftCopies = 0n;
    } else if (leftCopies > scale - 1n) {
      leftCopies = scale - 1n;
    }
    const rightCopies = scale - 1n - leftCopies;
    return {
      left: Fraction.#fromComponents(leftNumerator + leftCopies * reducedNumerator, leftDenominator + leftCopies * reducedDenominator),
      right: Fraction.#fromComponents(rightNumerator + rightCopies * reducedNumerator, rightDenominator + rightCopies * reducedDenominator)
    };
  }
  static mediantPartner(endpoint, mediant) {
    return Fraction.#fromComponents(mediant.numerator - endpoint.numerator, mediant.denominator - endpoint.denominator);
  }
  static isMediantTriple(left, mediant, right) {
    if (mediant.isInfinite) {
      return false;
    }
    try {
      const computedMediant = left.mediant(right);
      return mediant.equals(computedMediant);
    } catch (error) {
      return false;
    }
  }
  static isFareyTriple(left, mediant, right) {
    if (!Fraction.isMediantTriple(left, mediant, right)) {
      return false;
    }
    if (mediant.numerator === 0n && mediant.denominator === 1n && left.denominator === 0n && right.denominator === 0n) {
      return left.numerator === -1n && right.numerator === 1n || left.numerator === 1n && right.numerator === -1n;
    }
    const determinant = left.numerator * right.denominator - left.denominator * right.numerator;
    const magnitude = determinant < 0n ? -determinant : determinant;
    return magnitude === Fraction.#gcd(mediant.numerator, mediant.denominator);
  }
  sternBrocotParent() {
    if (this.isInfinite) {
      throw new Error("Infinite fractions don't have parents in Stern-Brocot tree");
    }
    if (this.numerator === 0n && this.denominator === 1n) {
      return null;
    }
    const path = this.sternBrocotPath();
    if (path.length === 0) {
      return null;
    }
    const parentPath = path.slice(0, -1);
    return Fraction.fromSternBrocotPath(parentPath);
  }
  sternBrocotChildren() {
    if (this.isInfinite) {
      throw new Error("Infinite fractions don't have children in Stern-Brocot tree");
    }
    const currentPath = this.sternBrocotPath();
    const leftPath = [...currentPath, "L"];
    const rightPath = [...currentPath, "R"];
    return {
      left: Fraction.fromSternBrocotPath(leftPath),
      right: Fraction.fromSternBrocotPath(rightPath)
    };
  }
  sternBrocotPath(maxLength = Fraction.DEFAULT_STERN_BROCOT_PATH_LIMIT) {
    if (!Number.isSafeInteger(maxLength) || maxLength < 0) {
      throw new RangeError("Stern-Brocot path limit must be a nonnegative safe integer");
    }
    if (this.isInfinite) {
      throw new Error("Infinite fractions don't have tree paths");
    }
    const reduced = this.reduce();
    if (reduced.numerator === 0n && reduced.denominator === 1n) {
      return [];
    }
    let left = new Fraction(-1, 0, { allowInfinite: true });
    let right = new Fraction(1, 0, { allowInfinite: true });
    let current = new Fraction(0, 1);
    const path = [];
    while (!current.equals(reduced)) {
      if (reduced.lessThan(current)) {
        path.push("L");
        right = current;
        current = left.mediant(current);
      } else {
        path.push("R");
        left = current;
        current = current.mediant(right);
      }
      if (path.length > maxLength) {
        throw new Error("Stern-Brocot path too long - this may indicate a bug in the algorithm");
      }
    }
    return path;
  }
  static fromSternBrocotPath(path) {
    let left = new Fraction(-1, 0, { allowInfinite: true });
    let right = new Fraction(1, 0, { allowInfinite: true });
    let current = new Fraction(0, 1);
    for (const direction of path) {
      if (direction === "L") {
        right = current;
        current = left.mediant(current);
      } else if (direction === "R") {
        left = current;
        current = current.mediant(right);
      } else {
        throw new Error(`Invalid direction in path: ${direction}`);
      }
    }
    return current;
  }
  isSternBrocotValid() {
    if (this.isInfinite) {
      return this.numerator === 1n || this.numerator === -1n;
    }
    try {
      const path = this.sternBrocotPath();
      const reconstructed = Fraction.fromSternBrocotPath(path);
      return this.equals(reconstructed);
    } catch (error) {
      return false;
    }
  }
  sternBrocotDepth() {
    if (this.isInfinite) {
      return Infinity;
    }
    if (this.numerator === 0n && this.denominator === 1n) {
      return 0;
    }
    return this.sternBrocotPath().length;
  }
  sternBrocotAncestors() {
    if (this.isInfinite) {
      return [];
    }
    const ancestors = [];
    const path = this.sternBrocotPath();
    for (let i = 0;i < path.length; i++) {
      const partialPath = path.slice(0, i);
      ancestors.push(Fraction.fromSternBrocotPath(partialPath));
    }
    ancestors.reverse();
    return ancestors;
  }
}

// ../../packages/core/src/fraction-interval.js
class FractionInterval {
  #low;
  #high;
  constructor(a, b) {
    if (!(a instanceof Fraction) || !(b instanceof Fraction)) {
      throw new Error("FractionInterval endpoints must be Fraction objects");
    }
    if (a.lessThanOrEqual(b)) {
      this.#low = a;
      this.#high = b;
    } else {
      this.#low = b;
      this.#high = a;
    }
  }
  get low() {
    return this.#low;
  }
  get high() {
    return this.#high;
  }
  mediantSplit() {
    const mediant = Fraction.mediant(this.#low, this.#high);
    return [
      new FractionInterval(this.#low, mediant),
      new FractionInterval(mediant, this.#high)
    ];
  }
  partitionWithMediants(n = 1) {
    if (n < 0) {
      throw new Error("Depth of mediant partitioning must be non-negative");
    }
    if (n === 0) {
      return [this];
    }
    let intervals = [this];
    for (let level = 0;level < n; level++) {
      const newIntervals = [];
      for (const interval of intervals) {
        const splitIntervals = interval.mediantSplit();
        newIntervals.push(...splitIntervals);
      }
      intervals = newIntervals;
    }
    return intervals;
  }
  partitionWith(fn) {
    const partitionPoints = fn(this.#low, this.#high);
    if (!Array.isArray(partitionPoints)) {
      throw new Error("Partition function must return an array of Fractions");
    }
    for (const point of partitionPoints) {
      if (!(point instanceof Fraction)) {
        throw new Error("Partition function must return Fraction objects");
      }
    }
    const allPoints = [this.#low, ...partitionPoints, this.#high];
    allPoints.sort((a, b) => {
      if (a.equals(b))
        return 0;
      if (a.lessThan(b))
        return -1;
      return 1;
    });
    if (!allPoints[0].equals(this.#low) || !allPoints[allPoints.length - 1].equals(this.#high)) {
      throw new Error("Partition points should be within the interval");
    }
    const uniquePoints = [];
    for (let i = 0;i < allPoints.length; i++) {
      if (i === 0 || !allPoints[i].equals(allPoints[i - 1])) {
        uniquePoints.push(allPoints[i]);
      }
    }
    const intervals = [];
    for (let i = 0;i < uniquePoints.length - 1; i++) {
      intervals.push(new FractionInterval(uniquePoints[i], uniquePoints[i + 1]));
    }
    return intervals;
  }
  toRationalInterval() {
    return new RationalInterval(this.#low.toRational(), this.#high.toRational());
  }
  static fromRationalInterval(interval) {
    return new FractionInterval(Fraction.fromRational(interval.low), Fraction.fromRational(interval.high));
  }
  toString() {
    return `${this.#low.toString()}:${this.#high.toString()}`;
  }
  equals(other) {
    return this.#low.equals(other.low) && this.#high.equals(other.high);
  }
  E(exponent) {
    const newLow = this.#low.E(exponent);
    const newHigh = this.#high.E(exponent);
    return new FractionInterval(newLow, newHigh);
  }
  toJSON() {
    return { $ratmath: "FractionInterval", low: this.#low, high: this.#high };
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

// ../../packages/core/src/certified-approximation.js
var Relation = Object.freeze({
  LESS: 1,
  EQUAL: 2,
  GREATER: 4
});
function asRational2(value, label = "value") {
  if (value instanceof Rational)
    return value;
  if (value instanceof Integer)
    return value.toRational();
  throw new TypeError(`${label} must be an Integer or Rational`);
}
function exactScalar(value) {
  const rational = asRational2(value);
  return rational.denominator === 1n ? new Integer(rational.numerator) : rational;
}
function pointInterval(value) {
  const rational = asRational2(value);
  return new RationalInterval(rational, rational);
}
function freezeRepresentation(value) {
  if (value === null || value === undefined)
    return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Approximation representation must be an object");
  }
  const copy = { ...value };
  if (Array.isArray(copy.certifiedPrefix)) {
    copy.certifiedPrefix = Object.freeze([...copy.certifiedPrefix]);
  }
  if (Array.isArray(copy.provisionalSuffix)) {
    copy.provisionalSuffix = Object.freeze([...copy.provisionalSuffix]);
  }
  if (copy.presentationHint && typeof copy.presentationHint === "object") {
    copy.presentationHint = Object.freeze({ ...copy.presentationHint });
  }
  if (copy.requested && typeof copy.requested === "object") {
    copy.requested = Object.freeze({ ...copy.requested });
  }
  if (copy.achieved && typeof copy.achieved === "object") {
    copy.achieved = Object.freeze({ ...copy.achieved });
  }
  return Object.freeze(copy);
}
function isPoint(interval) {
  return interval.low.equals(interval.high);
}
function normalize(candidate, enclosure, options = {}) {
  if (isPoint(enclosure) && options.preserveWrapper !== true) {
    return exactScalar(enclosure.low);
  }
  return new CertifiedApproximation(candidate, enclosure, options);
}
function operand(value) {
  if (value instanceof CertifiedApproximation) {
    return { candidate: value.candidate, enclosure: value.enclosure, approximation: true };
  }
  if (value instanceof RationalInterval) {
    return { candidate: null, enclosure: value, intervalCollection: true };
  }
  if (value instanceof Integer || value instanceof Rational) {
    return { candidate: value, enclosure: pointInterval(value), exact: true };
  }
  return null;
}
function presentationHint(value) {
  const rep = value?.representation;
  if (rep?.kind !== "radix")
    return null;
  const certified = String(rep.certifiedPrefix ?? "");
  const dot = certified.indexOf(".");
  return {
    base: rep.base,
    characters: rep.characters,
    certifiedFractionalDigits: dot === -1 ? 0 : certified.length - dot - 1,
    provisionalDigits: String(rep.provisionalSuffix ?? "").length
  };
}
function derivedOptions(left, right = null) {
  const hint = presentationHint(left) ?? presentationHint(right);
  return {
    representation: {
      kind: "derived",
      reason: "derived",
      original: null,
      ...hint ? { presentationHint: hint } : {}
    },
    sourceId: Symbol("ratmath-derived-approximation"),
    dependencies: right ? [left.sourceId, right.sourceId].filter(Boolean) : [left.sourceId].filter(Boolean)
  };
}
function decimalCylinder(interval, maxDigits = 100) {
  if (interval.low.lessThan(Rational.zero))
    return null;
  let scale = 1n;
  for (let digits = 0;digits <= maxDigits; digits++) {
    const lowNumerator = interval.low.numerator * scale;
    const highNumerator = interval.high.numerator * scale;
    if (lowNumerator % interval.low.denominator === 0n && highNumerator % interval.high.denominator === 0n) {
      const lowGrid = lowNumerator / interval.low.denominator;
      const highGrid = highNumerator / interval.high.denominator;
      if (highGrid === lowGrid + 1n)
        return { digits, scale, lowGrid };
    }
    scale *= 10n;
  }
  return null;
}
function fixedDecimalFromGrid(grid, digits) {
  const text = grid.toString();
  if (digits === 0)
    return text;
  const padded = text.padStart(digits + 1, "0");
  return `${padded.slice(0, -digits)}.${padded.slice(-digits)}`;
}
function candidateFractionalDigits(value, count) {
  const rational = asRational2(value);
  const numerator = rational.numerator < 0n ? -rational.numerator : rational.numerator;
  let remainder = numerator % rational.denominator;
  let result = "";
  for (let index = 0;index < count; index++) {
    remainder *= 10n;
    result += String(remainder / rational.denominator);
    remainder %= rational.denominator;
  }
  return result;
}
function serializeSourceId(sourceId) {
  return typeof sourceId === "string" || typeof sourceId === "number" ? sourceId : null;
}
function relationEnclosure(value) {
  if (value instanceof CertifiedApproximation)
    return value.enclosure;
  if (value instanceof RationalInterval)
    return value;
  if (value instanceof Integer || value instanceof Rational)
    return pointInterval(value);
  throw new TypeError("Possible relations require Core numeric values");
}
function possibleRelations(left, right) {
  if (left instanceof CertifiedApproximation && right instanceof CertifiedApproximation && left.sameSource(right)) {
    return Relation.EQUAL;
  }
  const a = relationEnclosure(left);
  const b = relationEnclosure(right);
  let result = 0;
  if (a.low.lessThan(b.high))
    result |= Relation.LESS;
  if (a.low.lessThanOrEqual(b.high) && b.low.lessThanOrEqual(a.high)) {
    result |= Relation.EQUAL;
  }
  if (a.high.greaterThan(b.low))
    result |= Relation.GREATER;
  return result;
}

class CertifiedApproximation {
  #candidate;
  #enclosure;
  #representation;
  #sourceId;
  #dependencies;
  constructor(candidate, enclosure, options = {}) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("Certified approximation options must be an object");
    }
    if (options.dependencies !== undefined && !Array.isArray(options.dependencies)) {
      throw new TypeError("Certified approximation dependencies must be an array");
    }
    if (options.sourceId !== undefined && !["string", "number", "symbol"].includes(typeof options.sourceId)) {
      throw new TypeError("Certified approximation sourceId must be a string, number, or symbol");
    }
    const exactCandidate = exactScalar(candidate);
    if (!(enclosure instanceof RationalInterval)) {
      throw new TypeError("Certified approximation enclosure must be a RationalInterval");
    }
    if (!enclosure.containsValue(asRational2(exactCandidate))) {
      throw new RangeError("Certified approximation candidate must lie in its enclosure");
    }
    this.#candidate = exactCandidate;
    this.#enclosure = enclosure;
    this.#representation = freezeRepresentation(options.representation);
    this.#sourceId = options.sourceId ?? Symbol("ratmath-certified-approximation");
    this.#dependencies = Object.freeze([...options.dependencies || []]);
  }
  get candidate() {
    return this.#candidate;
  }
  get enclosure() {
    return this.#enclosure;
  }
  get representation() {
    return this.#representation;
  }
  get sourceId() {
    return this.#sourceId;
  }
  get dependencies() {
    return this.#dependencies;
  }
  get low() {
    return this.#enclosure.low;
  }
  get high() {
    return this.#enclosure.high;
  }
  get isCertifiedApproximation() {
    return true;
  }
  sameSource(other) {
    return this === other || other instanceof CertifiedApproximation && this.#sourceId !== null && this.#sourceId !== undefined && this.#sourceId === other.sourceId;
  }
  copy() {
    return new CertifiedApproximation(this.#candidate, this.#enclosure, {
      representation: this.#representation,
      sourceId: this.#sourceId,
      dependencies: this.#dependencies
    });
  }
  #binary(other, operation) {
    const rhs = operand(other);
    if (!rhs)
      throw new TypeError(`Cannot ${operation} CertifiedApproximation and ${other?.constructor?.name ?? typeof other}`);
    if (rhs.intervalCollection) {
      return this.#enclosure[operation](rhs.enclosure);
    }
    if (rhs.approximation && this.sameSource(other)) {
      if (operation === "subtract")
        return Integer.zero;
      if (operation === "divide") {
        if (this.#enclosure.containsZero()) {
          throw new Error("Cannot divide an approximation containing zero by itself");
        }
        return Integer.one;
      }
    }
    const candidate = this.#candidate[operation](rhs.candidate);
    const enclosure = this.#enclosure[operation](rhs.enclosure);
    return normalize(candidate, enclosure, derivedOptions(this, rhs.approximation ? other : null));
  }
  add(other) {
    return this.#binary(other, "add");
  }
  subtract(other) {
    return this.#binary(other, "subtract");
  }
  multiply(other) {
    return this.#binary(other, "multiply");
  }
  divide(other) {
    return this.#binary(other, "divide");
  }
  _operateExactLeft(operation, left) {
    const lhs = operand(left);
    if (!lhs?.exact)
      throw new TypeError("Left operand must be an exact Core scalar");
    if (operation === "add" || operation === "multiply")
      return this[operation](left);
    const candidate = lhs.candidate[operation](this.#candidate);
    const enclosure = lhs.enclosure[operation](this.#enclosure);
    return normalize(candidate, enclosure, derivedOptions(this));
  }
  negate() {
    const representation = this.#representation?.kind === "radix" ? { ...this.#representation, original: this.#representation.original ? `-${this.#representation.original}`.replace(/^--/, "") : null } : { kind: "derived", reason: "derived", original: null };
    return normalize(this.#candidate.negate(), this.#enclosure.negate(), {
      representation,
      sourceId: Symbol("ratmath-derived-approximation"),
      dependencies: [this.#sourceId]
    });
  }
  reciprocal() {
    return normalize(asRational2(this.#candidate).reciprocal(), this.#enclosure.reciprocate(), derivedOptions(this));
  }
  pow(exponent) {
    return normalize(this.#candidate.pow(exponent), this.#enclosure.pow(exponent), derivedOptions(this));
  }
  E(exponent) {
    return normalize(this.#candidate.E(exponent), this.#enclosure.E(exponent), derivedOptions(this));
  }
  possibleRelationsTo(other) {
    return possibleRelations(this, other);
  }
  toRationalInterval() {
    return this.#enclosure;
  }
  toRational() {
    if (!isPoint(this.#enclosure)) {
      throw new Error("Cannot convert a non-point CertifiedApproximation to Rational");
    }
    return this.#enclosure.low;
  }
  toString() {
    if (this.#representation?.original)
      return this.#representation.original;
    const entirelyNegative = this.#enclosure.high.lessThan(Rational.zero);
    const displayEnclosure = entirelyNegative ? this.#enclosure.negate() : this.#enclosure;
    const hint = this.#representation?.presentationHint;
    const cylinder = hint?.base === 10 ? decimalCylinder(displayEnclosure) : null;
    if (cylinder) {
      const prefix = fixedDecimalFromGrid(cylinder.lowGrid, cylinder.digits);
      const provisionalCount = hint.provisionalDigits ?? 0;
      const displayCandidate = entirelyNegative ? this.#candidate.negate() : this.#candidate;
      const candidateDigits = candidateFractionalDigits(displayCandidate, cylinder.digits + provisionalCount);
      const provisional = provisionalCount > 0 ? candidateDigits.slice(cylinder.digits, cylinder.digits + provisionalCount) : "";
      return `${entirelyNegative ? "-" : ""}${prefix}?${provisional}`;
    }
    const displayCandidate = entirelyNegative ? this.#candidate.negate() : this.#candidate;
    const candidateText = displayCandidate.toString();
    return `${entirelyNegative ? "-" : ""}${candidateText}?[=${displayEnclosure.low}:${displayEnclosure.high}]`;
  }
  toJSON() {
    return {
      $ratmath: "CertifiedApproximation",
      candidate: this.#candidate,
      enclosure: this.#enclosure,
      representation: this.#representation,
      sourceId: serializeSourceId(this.#sourceId),
      dependencies: this.#dependencies.map(serializeSourceId).filter((dependency) => dependency !== null)
    };
  }
}
function normalizeCertifiedApproximation(candidate, enclosure, options = {}) {
  return normalize(candidate, enclosure, options);
}
function positionalRational(sign, integerDigits, fractionalDigits, baseSystem) {
  const integer = integerDigits.length ? baseSystem.toDecimal(integerDigits) : 0n;
  const fractional = fractionalDigits.length ? baseSystem.toDecimal(fractionalDigits) : 0n;
  const scale = BigInt(baseSystem.base) ** BigInt(fractionalDigits.length);
  return new Rational((sign < 0n ? -1n : 1n) * (integer * scale + fractional), scale);
}
function certifiedRadixPrefix({
  integerDigits,
  fractionalDigits = "",
  provisionalDigits = "",
  negative = false,
  baseSystem = BaseSystem.DECIMAL,
  enclosure = null,
  original = null,
  reason = "literal",
  requested = null,
  achieved = null,
  roundingMode = null,
  sourceId
}) {
  if (!(baseSystem instanceof BaseSystem))
    throw new TypeError("baseSystem must be a BaseSystem");
  if (!baseSystem.supportsPositionalFractions) {
    throw new RangeError("Certified radix prefixes require a conventional positional BaseSystem");
  }
  if (!baseSystem.isValidString(integerDigits || "0"))
    throw new Error("Invalid radix integer digits");
  if (fractionalDigits && !baseSystem.isValidString(fractionalDigits))
    throw new Error("Invalid radix fractional digits");
  if (provisionalDigits && !baseSystem.isValidString(provisionalDigits))
    throw new Error("Invalid provisional radix digits");
  const sign = negative ? -1n : 1n;
  const prefix = positionalRational(sign, integerDigits || "0", fractionalDigits, baseSystem);
  const candidateFraction = fractionalDigits + provisionalDigits;
  const candidate = positionalRational(sign, integerDigits || "0", candidateFraction, baseSystem);
  const width = new Rational(1n, BigInt(baseSystem.base) ** BigInt(fractionalDigits.length));
  const prefixHull = negative ? new RationalInterval(prefix.subtract(width), prefix) : new RationalInterval(prefix, prefix.add(width));
  const authoritative = enclosure ?? prefixHull;
  if (!prefixHull.contains(authoritative)) {
    throw new RangeError("Explicit enclosure must lie inside the certified radix prefix cylinder");
  }
  return new CertifiedApproximation(candidate, authoritative, {
    sourceId,
    representation: {
      kind: "radix",
      base: baseSystem.base,
      characters: baseSystem.characters.join(""),
      certifiedPrefix: `${negative ? "-" : ""}${integerDigits || "0"}${fractionalDigits.length || provisionalDigits.length ? `.${fractionalDigits}` : ""}`,
      provisionalSuffix: provisionalDigits,
      original,
      reason,
      requested,
      achieved: achieved ?? { fractionalDigits: fractionalDigits.length },
      roundingMode
    }
  });
}
function certifiedContinuedFractionPrefix({
  coefficients,
  provisionalCoefficients = [],
  original = null,
  reason = "literal",
  requested = null,
  achieved = null,
  sourceId
}) {
  const certified = coefficients.map((value) => toExactBigInt(value, "Continued-fraction coefficient"));
  const provisional = provisionalCoefficients.map((value) => toExactBigInt(value, "Provisional continued-fraction coefficient"));
  if (certified.length === 0)
    throw new Error("Continued-fraction approximation requires a certified coefficient");
  if (certified.slice(1).some((value) => value <= 0n) || provisional.some((value) => value <= 0n)) {
    throw new Error("Continued-fraction tail coefficients must be positive");
  }
  const convergent = Rational.fromContinuedFraction(certified);
  const adjacentCoefficients = [...certified];
  adjacentCoefficients[adjacentCoefficients.length - 1] += 1n;
  const adjacent = Rational.fromContinuedFraction(adjacentCoefficients);
  const candidate = Rational.fromContinuedFraction([...certified, ...provisional]);
  return new CertifiedApproximation(candidate, new RationalInterval(convergent, adjacent), {
    sourceId,
    representation: {
      kind: "continuedFraction",
      certifiedPrefix: certified.map(String),
      provisionalSuffix: provisional.map(String),
      original,
      reason,
      requested,
      achieved: achieved ?? { terms: certified.length }
    }
  });
}
function boundedDecimalApproximation(value, options = {}) {
  const fractionalDigits = options.fractionalDigits ?? 20;
  if (!Number.isSafeInteger(fractionalDigits) || fractionalDigits < 0) {
    throw new RangeError("fractionalDigits must be a nonnegative safe integer");
  }
  const rational = asRational2(value);
  const negative = rational.numerator < 0n;
  const numerator = negative ? -rational.numerator : rational.numerator;
  const integer = numerator / rational.denominator;
  let remainder = numerator % rational.denominator;
  let digits = "";
  for (let index = 0;index < fractionalDigits && remainder !== 0n; index++) {
    remainder *= 10n;
    digits += String(remainder / rational.denominator);
    remainder %= rational.denominator;
  }
  if (remainder === 0n)
    return exactScalar(rational);
  const original = `${negative ? "-" : ""}${integer}.${digits}?`;
  return certifiedRadixPrefix({
    integerDigits: String(integer),
    fractionalDigits: digits,
    negative,
    original,
    reason: options.reason ?? "truncated",
    requested: { fractionalDigits },
    achieved: { fractionalDigits: digits.length }
  });
}
function boundedContinuedFractionApproximation(value, options = {}) {
  const maxTerms = options.maxTerms ?? Rational.DEFAULT_CF_LIMIT;
  if (!Number.isSafeInteger(maxTerms) || maxTerms < 1) {
    throw new RangeError("maxTerms must be a positive safe integer");
  }
  const rational = asRational2(value);
  const coefficients = rational.toContinuedFraction({ maxTerms });
  const extended = rational.toContinuedFraction({ maxTerms: maxTerms + 1 });
  if (extended.length <= maxTerms)
    return exactScalar(rational);
  const [first, ...tail] = coefficients;
  const original = tail.length ? `${first}.~${tail.join("~")}?` : `${first}.~?`;
  return certifiedContinuedFractionPrefix({
    coefficients,
    original,
    reason: options.reason ?? "truncated",
    requested: { maxTerms },
    achieved: { terms: coefficients.length }
  });
}

// ../../packages/core/src/type-promotion.js
class TypePromotion {
  constructor() {
    throw new TypeError("TypePromotion is a static utility class");
  }
  static getTypeLevel(value) {
    if (value instanceof Integer)
      return 0;
    if (value instanceof Rational)
      return 1;
    if (value instanceof RationalInterval)
      return 2;
    if (value instanceof CertifiedApproximation) {
      throw new Error("CertifiedApproximation is scalar uncertainty, not a linear promotion level");
    }
    throw new Error(`Unknown type: ${value.constructor.name}`);
  }
  static integerToRational(integer) {
    return new Rational(integer.value, 1n);
  }
  static rationalToInterval(rational) {
    return new RationalInterval(rational, rational);
  }
  static integerToInterval(integer) {
    const rational = TypePromotion.integerToRational(integer);
    return TypePromotion.rationalToInterval(rational);
  }
  static promoteToLevel(value, targetLevel) {
    const currentLevel = TypePromotion.getTypeLevel(value);
    if (!Number.isInteger(targetLevel) || targetLevel < 0 || targetLevel > 2) {
      throw new Error(`Invalid target level: ${targetLevel}`);
    }
    if (currentLevel === targetLevel) {
      return value;
    }
    if (currentLevel > targetLevel) {
      throw new Error(`Cannot demote from level ${currentLevel} to level ${targetLevel}`);
    }
    let promoted = value;
    for (let level = currentLevel;level < targetLevel; level++) {
      if (level === 0) {
        promoted = TypePromotion.integerToRational(promoted);
      } else if (level === 1) {
        promoted = TypePromotion.rationalToInterval(promoted);
      }
    }
    return promoted;
  }
  static promoteToCommonType(a, b) {
    const levelA = TypePromotion.getTypeLevel(a);
    const levelB = TypePromotion.getTypeLevel(b);
    const targetLevel = Math.max(levelA, levelB);
    return [
      TypePromotion.promoteToLevel(a, targetLevel),
      TypePromotion.promoteToLevel(b, targetLevel)
    ];
  }
  static add(a, b) {
    if (a instanceof RationalInterval && b instanceof CertifiedApproximation)
      return a.add(b.enclosure);
    if (b instanceof RationalInterval && a instanceof CertifiedApproximation)
      return a.enclosure.add(b);
    if (a instanceof CertifiedApproximation)
      return a.add(b);
    if (b instanceof CertifiedApproximation)
      return b._operateExactLeft("add", a);
    const [promotedA, promotedB] = TypePromotion.promoteToCommonType(a, b);
    return promotedA.add(promotedB);
  }
  static subtract(a, b) {
    if (a instanceof RationalInterval && b instanceof CertifiedApproximation)
      return a.subtract(b.enclosure);
    if (b instanceof RationalInterval && a instanceof CertifiedApproximation)
      return a.enclosure.subtract(b);
    if (a instanceof CertifiedApproximation)
      return a.subtract(b);
    if (b instanceof CertifiedApproximation)
      return b._operateExactLeft("subtract", a);
    const [promotedA, promotedB] = TypePromotion.promoteToCommonType(a, b);
    return promotedA.subtract(promotedB);
  }
  static multiply(a, b) {
    if (a instanceof RationalInterval && b instanceof CertifiedApproximation)
      return a.multiply(b.enclosure);
    if (b instanceof RationalInterval && a instanceof CertifiedApproximation)
      return a.enclosure.multiply(b);
    if (a instanceof CertifiedApproximation)
      return a.multiply(b);
    if (b instanceof CertifiedApproximation)
      return b._operateExactLeft("multiply", a);
    const [promotedA, promotedB] = TypePromotion.promoteToCommonType(a, b);
    return promotedA.multiply(promotedB);
  }
  static divide(a, b) {
    if (a instanceof RationalInterval && b instanceof CertifiedApproximation)
      return a.divide(b.enclosure);
    if (b instanceof RationalInterval && a instanceof CertifiedApproximation)
      return a.enclosure.divide(b);
    if (a instanceof CertifiedApproximation)
      return a.divide(b);
    if (b instanceof CertifiedApproximation)
      return b._operateExactLeft("divide", a);
    if (a instanceof Integer && b instanceof Integer) {
      return a.divide(b);
    }
    const [promotedA, promotedB] = TypePromotion.promoteToCommonType(a, b);
    return promotedA.divide(promotedB);
  }
  static eNotation(base, exponent) {
    return base.E(exponent);
  }
  static power(base, exponent) {
    return base.pow(exponent);
  }
  static multiplyPower(base, exponent) {
    if (base.mpow && typeof base.mpow === "function") {
      return base.mpow(exponent);
    }
    return base.pow(exponent);
  }
  static negate(value) {
    if (value instanceof Integer) {
      return value.negate();
    } else if (value instanceof Rational) {
      return value.negate();
    } else if (value instanceof RationalInterval) {
      const negOne = new Rational(-1n, 1n);
      const negInterval = new RationalInterval(negOne, negOne);
      return negInterval.multiply(value);
    }
    throw new Error(`Cannot negate unknown type: ${value.constructor.name}`);
  }
  static determineTypeFromString(str) {
    if (str.includes("?"))
      return "approximation";
    if (str.includes(":") || str.includes("[") && str.includes("]")) {
      return "interval";
    }
    if (str.includes("/") || str.includes("..") || str.includes(".")) {
      return "rational";
    }
    return "integer";
  }
}

// ../../packages/core/src/numeral-system.js
var NUMERAL_SYSTEM_SCHEMA = "ratmath.numeral-system@1";
var NUMERAL_LIMITS = Object.freeze({ tokens: 256, tokenLength: 32, sourceLength: 65536, digits: 4096, bits: 16384 });
var reserved = /[\s+\-*/^!()[\]:.#~_`?\\]/u;
var fail = (message) => {
  throw new Error(`Numeral system: ${message}`);
};
var abs = (value) => value < 0n ? -value : value;
function boundedInteger(value) {
  if (typeof value !== "bigint" || abs(value).toString(2).length > NUMERAL_LIMITS.bits)
    fail("exact component exceeds 16384 bits");
  return value;
}
function exact(value) {
  const result = value instanceof Rational ? value : value instanceof Integer ? new Rational(value.value) : typeof value === "bigint" ? new Rational(value) : null;
  if (!result)
    fail("requires an exact Rational or Integer");
  boundedInteger(result.numerator);
  boundedInteger(result.denominator);
  return result;
}
function floor(value) {
  let q = value.numerator / value.denominator;
  if (value.numerator < 0n && value.numerator % value.denominator)
    q--;
  return q;
}
function digitLimit(value = 256) {
  if (!Number.isSafeInteger(value) || value < 0 || value > NUMERAL_LIMITS.digits)
    fail("maxDigits must be 0..4096");
  return value;
}
var rational = (value) => new Rational(value);
var key = (value) => `${value.numerator}/${value.denominator}`;

class NumeralSystem {
  constructor({ schema = NUMERAL_SYSTEM_SCHEMA, kind = "ordinary", radix, tokens } = {}) {
    if (schema !== NUMERAL_SYSTEM_SCHEMA)
      fail("unsupported schema");
    if (!["ordinary", "multiToken", "balanced", "negative"].includes(kind))
      fail("unsupported family");
    if (!Number.isSafeInteger(radix) || Math.abs(radix) < 2 || Math.abs(radix) > NUMERAL_LIMITS.tokens)
      fail("absolute radix must be 2..256");
    if (kind === "negative" !== radix < 0)
      fail("negative family requires negative radix; other families require positive radix");
    if (kind === "balanced" && radix % 2 === 0)
      fail("balanced systems require an odd radix");
    if (!Array.isArray(tokens) || tokens.length !== Math.abs(radix))
      fail("requires exactly one token for each digit value");
    for (const token of tokens) {
      if (typeof token !== "string" || !token.length || [...token].length > NUMERAL_LIMITS.tokenLength || reserved.test(token))
        fail("tokens must be nonempty, bounded and disjoint from numeral punctuation");
      if (kind === "ordinary" && [...token].length !== 1)
        fail("ordinary systems require one Unicode character per token");
    }
    for (let i = 0;i < tokens.length; i++)
      for (let j = i + 1;j < tokens.length; j++) {
        if (tokens[i].startsWith(tokens[j]) || tokens[j].startsWith(tokens[i]))
          fail("tokens must be unique and prefix-free");
      }
    this.schema = schema;
    this.kind = kind;
    this.radix = radix;
    this.offset = kind === "balanced" ? -(radix - 1) / 2 : 0;
    this.tokens = Object.freeze([...tokens]);
    Object.freeze(this);
  }
  toJSON() {
    return { schema: this.schema, kind: this.kind, radix: this.radix, tokens: [...this.tokens] };
  }
  tokenize(source, { allowEmpty = false } = {}) {
    if (typeof source !== "string" || source.length > NUMERAL_LIMITS.sourceLength)
      fail("source length budget exceeded");
    const result = [];
    for (let offset = 0;offset < source.length; ) {
      if (source[offset] === "_") {
        if (!result.length || offset + 1 === source.length || source[offset + 1] === "_")
          fail("group separators must lie between tokens");
        offset++;
        continue;
      }
      const index = this.tokens.findIndex((token) => source.startsWith(token, offset));
      if (index < 0)
        fail(`invalid token at position ${offset + 1}`);
      result.push(index + this.offset);
      offset += this.tokens[index].length;
      if (result.length > NUMERAL_LIMITS.digits)
        fail("digit work budget exceeded");
    }
    if (!result.length && !allowEmpty)
      fail("requires at least one digit");
    return result;
  }
  fromDigits(digits) {
    if (!Array.isArray(digits) || digits.length > NUMERAL_LIMITS.digits || digits.some((digit) => !Number.isInteger(digit) || digit < this.offset || digit >= this.offset + this.tokens.length))
      fail("invalid or oversized digit array");
    let result = 0n;
    for (const digit of digits)
      result = boundedInteger(result * BigInt(this.radix) + BigInt(digit));
    return result;
  }
  parseInteger(source) {
    let sign = 1n;
    if (/^[+-]/.test(source)) {
      if (source[0] === "-")
        sign = -1n;
      source = source.slice(1);
    }
    return sign * this.fromDigits(this.tokenize(source));
  }
  parse(source) {
    if (typeof source !== "string" || source.length > NUMERAL_LIMITS.sourceLength)
      fail("source length budget exceeded");
    source = source.trim();
    if (!source)
      fail("empty numeral");
    const shifts = source.split("_^");
    if (shifts.length > 2 || shifts.length === 2 && !shifts[1])
      fail("invalid radix shift");
    source = shifts[0];
    let result;
    if (source.includes(".~")) {
      const parts = source.replace(/^~/, "").replace(".~", "~").split("~");
      if (parts.length < 2 || parts.length > 256)
        fail("continued-fraction term budget exceeded");
      const terms = parts.map((term) => this.parseInteger(term));
      if (terms.slice(1).some((term) => term <= 0n))
        fail("continued-fraction tails must be positive");
      result = rational(terms.pop());
      while (terms.length)
        result = exact(rational(terms.pop()).add(rational(1n).divide(result)));
    } else if (source.includes("..")) {
      const parts = source.split("..");
      if (parts.length !== 2 || parts[1].split("/").length !== 2)
        fail("mixed numeral requires whole..numerator/denominator");
      const whole = this.parseInteger(parts[0]), [n, d] = parts[1].split("/").map((text) => this.parseInteger(text));
      if (n < 0n || d <= 0n)
        fail("mixed fractional components must be nonnegative with positive denominator");
      result = rational(whole).add(new Rational(whole < 0n || parts[0].startsWith("-") ? -n : n, d));
    } else if (source.includes("/")) {
      const parts = source.split("/");
      if (parts.length !== 2)
        fail("fraction requires one slash");
      result = new Rational(this.parseInteger(parts[0]), this.parseInteger(parts[1]));
    } else {
      let sign = 1n;
      if (/^[+-]/.test(source)) {
        if (source[0] === "-")
          sign = -1n;
        source = source.slice(1);
      }
      const sections = source.split("#");
      if (sections.length > 2 || sections.length === 2 && !sections[1])
        fail("repeat requires one nonempty block");
      const point = sections[0].split(".");
      if (point.every((text) => !text))
        fail("requires at least one digit");
      if (point.length > 2)
        fail("multiple radix points");
      const whole = this.fromDigits(this.tokenize(point[0], { allowEmpty: point.length === 2 }));
      const prefix = this.tokenize(point[1] || "", { allowEmpty: true });
      const base = BigInt(this.radix), power = boundedInteger(base ** BigInt(prefix.length));
      result = rational(whole).add(new Rational(this.fromDigits(prefix), power));
      if (sections.length === 2) {
        const repeated = this.tokenize(sections[1]);
        const denominator = boundedInteger(power * (base ** BigInt(repeated.length) - 1n));
        result = result.add(new Rational(this.fromDigits(repeated), denominator));
      }
      if (sign < 0n)
        result = result.negate();
    }
    if (shifts.length === 2) {
      const exponent = this.parseInteger(shifts[1]);
      if (abs(exponent) > 4096n)
        fail("radix shift budget exceeded");
      const power = boundedInteger(BigInt(this.radix) ** abs(exponent));
      result = exponent < 0n ? result.divide(rational(power)) : result.multiply(rational(power));
    }
    return exact(result);
  }
  integer(value, maxDigits = NUMERAL_LIMITS.digits) {
    boundedInteger(value);
    digitLimit(maxDigits);
    const negative = this.kind !== "balanced" && this.radix > 0 && value < 0n;
    let remaining = negative ? -value : value;
    const digits = [], carries = [];
    const modulus = BigInt(Math.abs(this.radix)), base = BigInt(this.radix);
    do {
      if (digits.length >= maxDigits)
        return { status: "budgetExhausted", digits: digits.reverse(), carries, remaining, negative, spelling: null };
      const residue = (remaining % modulus + modulus) % modulus;
      const digit = Number((residue - BigInt(this.offset) + modulus) % modulus) + this.offset;
      const next = (remaining - BigInt(digit)) / base;
      carries.push({ before: remaining, digit, radix: this.radix, after: next });
      digits.push(digit);
      remaining = next;
    } while (remaining !== 0n);
    digits.reverse();
    return { status: "complete", digits, carries, remaining, negative, spelling: `${negative ? "-" : ""}${this.digitText(digits)}` };
  }
  digitText(digits) {
    return digits.map((digit) => this.tokens[digit - this.offset]).join("");
  }
  format(value, { maxDigits = 256, mode = "expansion" } = {}) {
    const source = exact(value);
    digitLimit(maxDigits);
    if (!["expansion", "fraction"].includes(mode))
      fail("format mode must be expansion or fraction");
    if (mode === "fraction") {
      const numerator = this.integer(source.numerator, maxDigits), denominator = this.integer(source.denominator, maxDigits);
      return { schema: "ratmath.numeral-expansion@1", system: this.toJSON(), source, mode, status: numerator.spelling && denominator.spelling ? "complete" : "budgetExhausted", spelling: numerator.spelling && denominator.spelling ? `${numerator.spelling}/${denominator.spelling}` : null, numerator, denominator };
    }
    const negative = this.radix > 0 && this.offset === 0 && source.numerator < 0n;
    const working = negative ? source.negate() : source;
    const lower = this.offset < 0 ? new Rational(-1, 2) : this.radix < 0 ? new Rational(this.radix, 1 - this.radix) : rational(0n);
    const whole = floor(working.subtract(lower)), integer = this.integer(whole, maxDigits);
    let remainder = working.subtract(rational(whole)), repeatStart = null;
    const fractional = [], seen = new Map, steps = [];
    if (integer.status === "complete")
      while (remainder.numerator !== 0n) {
        const id = key(remainder);
        if (seen.has(id)) {
          repeatStart = seen.get(id);
          break;
        }
        if (integer.digits.length + fractional.length >= maxDigits)
          break;
        seen.set(id, fractional.length);
        const scaled = remainder.multiply(rational(BigInt(this.radix)));
        let digit = Number(floor(scaled.subtract(lower)));
        digit = Math.max(this.offset, Math.min(this.offset + this.tokens.length - 1, digit));
        const next = exact(scaled.subtract(rational(BigInt(digit))));
        steps.push({ before: remainder, scaled, digit, after: next });
        fractional.push(digit);
        remainder = next;
      }
    const complete = integer.status === "complete" && (remainder.numerator === 0n || repeatStart !== null);
    const prefix = repeatStart === null ? fractional : fractional.slice(0, repeatStart), repeat = repeatStart === null ? [] : fractional.slice(repeatStart);
    const partial = integer.spelling === null ? null : `${negative ? "-" : ""}${integer.spelling}${fractional.length || repeat.length ? "." + this.digitText(prefix) : ""}${repeat.length ? "#" + this.digitText(repeat) : ""}`;
    const spelling = complete ? partial : null;
    return { schema: "ratmath.numeral-expansion@1", system: this.toJSON(), source, mode, status: complete ? "complete" : "budgetExhausted", spelling, partial, negative, integer, prefix, repeat, steps, remaining: remainder, maxDigits, work: integer.digits.length + fractional.length };
  }
  locale(source, { point = ".", group = ",", groupSize = 3 } = {}, direction = "format") {
    if (typeof point !== "string" || typeof group !== "string" || !point.length || !group.length || point.length > 4 || group.length > 4 || point.startsWith(group) || group.startsWith(point))
      fail("locale separators must be distinct, bounded and nonempty");
    if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 8)
      fail("locale groupSize must be 1..8");
    for (const separator of [point, group]) {
      if (/[+\-*/^!()[\]:#~`?\\]/u.test(separator) || this.tokens.some((token) => token.includes(separator) || separator.includes(token)))
        fail("locale separator collides with numeral tokens or grammar");
    }
    if (typeof source !== "string" || source.length > NUMERAL_LIMITS.sourceLength)
      fail("source length budget exceeded");
    if (!["format", "parse"].includes(direction))
      fail("locale direction must be format or parse");
    const encode = (canonical) => {
      if (/[\/~]|\.\.|_\^/.test(canonical))
        fail("locale adapters support positional expansions only");
      this.parse(canonical);
      const sign = /^[+-]/.test(canonical) ? canonical[0] : "";
      const body = sign ? canonical.slice(1) : canonical;
      const pieces = body.split(".");
      if (pieces.length === 1 && body.includes("#"))
        return encode(sign + body.replace("#", ".#"));
      const values = this.tokenize(pieces[0]);
      const groups = [];
      for (let stop = values.length;stop > 0; stop -= groupSize)
        groups.unshift(this.digitText(values.slice(Math.max(0, stop - groupSize), stop)));
      return sign + groups.join(group) + (pieces.length === 2 ? point + pieces[1] : "");
    };
    if (direction === "format")
      return encode(source);
    let canonical = "";
    for (let offset = 0;offset < source.length; ) {
      if (source.startsWith(point, offset)) {
        canonical += ".";
        offset += point.length;
      } else if (source.startsWith(group, offset))
        offset += group.length;
      else {
        const token = this.tokens.find((token) => source.startsWith(token, offset));
        canonical += token ?? source[offset];
        offset += token?.length ?? 1;
      }
    }
    if (encode(canonical) !== source)
      fail("noncanonical locale grouping");
    return this.parse(canonical);
  }
  normalize(source, options) {
    return this.format(this.parse(source), options);
  }
  places(source) {
    source = source.trim();
    const value = this.parse(source);
    if (/[#/~]|\.\.|_\^/.test(source))
      return { value, places: [], diagnostic: "Compound numeral: inspect its exact value and normalized expansion." };
    let sign = 1n;
    if (/^[+-]/.test(source)) {
      if (source[0] === "-")
        sign = -1n;
      source = source.slice(1);
    }
    const [a, b = ""] = source.split("."), whole = this.tokenize(a, { allowEmpty: true }), fraction = this.tokenize(b, { allowEmpty: true });
    const digits = [...whole, ...fraction];
    return { value, places: digits.map((digit, index) => {
      const exponent = whole.length - index - 1, power = BigInt(this.radix) ** BigInt(Math.abs(exponent));
      const weight = exponent < 0 ? new Rational(1n, power) : rational(power);
      return { token: this.tokens[digit - this.offset], digit, exponent, weight, contribution: weight.multiply(rational(sign * BigInt(digit))) };
    }) };
  }
}

// ../../packages/core/src/number-parser.js
function parseDecimalValue(input) {
  const [numerator, denominator] = parseDecimalParts(input);
  return new Rational(numerator, denominator);
}
function parseRationalLiteral(input) {
  const [numerator, denominator] = parseRationalParts(input);
  return new Rational(numerator, denominator);
}
function decimalShape(input) {
  const match = input.match(new RegExp(`^([+-]?)(?:(${DIGITS})(?:\\.(${DIGITS})?)?|\\.(${DIGITS}))$`));
  if (!match) {
    throw new Error("Decimal interval notation requires an integer or finite decimal base");
  }
  const sign = match[1] === "-" ? "-" : "";
  const integer = match[2] ? cleanDigits(match[2]) : "0";
  const fractional = match[3] ? cleanDigits(match[3]) : match[4] ? cleanDigits(match[4]) : "";
  const hasPoint = input.includes(".");
  return {
    sign,
    integer,
    fractional,
    hasPoint,
    normalized: `${sign}${integer}${hasPoint ? `.${fractional}` : ""}`
  };
}
function parseOffset(value) {
  const normalized = value.startsWith("#") ? `0.${value}` : value;
  return parseRationalLiteral(normalized);
}
function scaledOffset(value, decimalPlaces, hasPoint) {
  const offset = parseOffset(value);
  if (!hasPoint)
    return offset;
  return offset.divide(new Rational(10n ** BigInt(decimalPlaces)));
}
function parseUncertainty(input) {
  const match = input.match(/^(.+)\[([^\[\]]+)\]$/);
  if (!match) {
    throw new Error(`Invalid decimal interval notation: ${input}`);
  }
  const shape = decimalShape(match[1]);
  const body = match[2].trim();
  const base = parseDecimalValue(shape.normalized);
  if (body.includes(",")) {
    throw new Error("Decimal interval notation requires ':' between bracketed values");
  }
  if (body.startsWith("+-") || body.startsWith("-+")) {
    const offsetText = body.slice(2).trim();
    if (offsetText.length === 0) {
      throw new Error("Symmetric notation must have a valid number after '+-' or '-+'");
    }
    const offset = scaledOffset(offsetText, shape.fractional.length, shape.hasPoint);
    return new RationalInterval(base.subtract(offset), base.add(offset));
  }
  const parts = body.split(/\s*:\s*/);
  if (parts.length > 2 || parts.length === 0 || parts.some((part) => part.length === 0)) {
    throw new Error("Decimal interval brackets require one or two colon-separated values");
  }
  const hasSignedPart = parts.some((part) => part.startsWith("+") || part.startsWith("-"));
  if (hasSignedPart) {
    let positive = null;
    let negative = null;
    for (const part of parts) {
      if (part.startsWith("+") && positive === null) {
        positive = part.slice(1);
      } else if (part.startsWith("-") && negative === null) {
        negative = part.slice(1);
      } else {
        throw new Error("Relative interval notation allows one '+' and one '-' offset");
      }
    }
    const positiveOffset = positive === null ? Rational.zero : scaledOffset(positive, shape.fractional.length, shape.hasPoint);
    const negativeOffset = negative === null ? Rational.zero : scaledOffset(negative, shape.fractional.length, shape.hasPoint);
    return new RationalInterval(base.subtract(negativeOffset), base.add(positiveOffset));
  }
  if (parts.length !== 2) {
    throw new Error("Compact interval notation requires exactly two endpoints");
  }
  const endpoint = (suffix) => {
    if (shape.hasPoint && shape.fractional.length === 0) {
      if (suffix.startsWith("#")) {
        return parseDecimalValue(`${shape.sign}${shape.integer}.${suffix}`);
      }
      const cleanSuffix = cleanDigits(suffix);
      return parseDecimalValue(`${shape.sign}${shape.integer}.${cleanSuffix}`);
    }
    const cleanSuffix = cleanDigits(suffix);
    const point = shape.hasPoint ? "." : "";
    return parseDecimalValue(`${shape.sign}${shape.integer}${point}${shape.fractional}${cleanSuffix}`);
  };
  return new RationalInterval(endpoint(parts[0]), endpoint(parts[1]));
}
function parseApproximation(input) {
  let value = inputString(input, "certified approximation");
  const derived = value.match(/^(.+?)\?\[=([^:]+):([^:]+)\]$/);
  if (derived) {
    const candidate = parseRationalLiteral(derived[1]);
    let enclosure = new RationalInterval(parseRationalLiteral(derived[2]), parseRationalLiteral(derived[3]));
    if (!enclosure.containsValue(candidate) && candidate.lessThan(Rational.zero) && enclosure.low.greaterThanOrEqual(Rational.zero)) {
      enclosure = enclosure.negate();
    }
    return new CertifiedApproximation(candidate, enclosure, {
      representation: {
        kind: "derived",
        reason: "serialized",
        original: value
      }
    });
  }
  const explicitCf = value.startsWith("~");
  const cfValue = explicitCf ? value.slice(1) : value;
  const cf = cfValue.match(new RegExp(`^([+-]?${DIGITS})\\.~(${DIGITS}(?:~${DIGITS})*)\\?(${DIGITS}(?:~${DIGITS})*)?$`));
  if (cf) {
    const certified = [
      BigInt(cleanDigits(cf[1], { signed: true })),
      ...cf[2].split("~").map((term) => BigInt(cleanDigits(term)))
    ];
    const provisional = cf[3] ? cf[3].split("~").map((term) => BigInt(cleanDigits(term))) : [];
    return certifiedContinuedFractionPrefix({
      coefficients: certified,
      provisionalCoefficients: provisional,
      original: value
    });
  }
  const match = value.match(/^(.+?)\?((?:\d(?:_?\d)*)?)(\[[^\[\]]+\])?$/);
  if (!match)
    throw new Error(`Invalid certified approximation notation: ${input}`);
  const shape = decimalShape(match[1]);
  const provisional = match[2] ? cleanDigits(match[2]) : "";
  const candidateText = shape.hasPoint ? `${shape.normalized}${provisional}` : `${shape.normalized}${provisional ? `.${provisional}` : ""}`;
  const explicitEnclosure = match[3] ? parseUncertainty(`${candidateText}${match[3]}`) : null;
  return certifiedRadixPrefix({
    integerDigits: shape.integer,
    fractionalDigits: shape.fractional,
    provisionalDigits: provisional,
    negative: shape.sign === "-",
    enclosure: explicitEnclosure,
    original: value
  });
}
function parseNumber(input) {
  const value = inputString(input);
  if (value.includes("?")) {
    return parseApproximation(value);
  }
  if (value.includes("[") || value.includes("]")) {
    return parseUncertainty(value);
  }
  const intervalParts = value.split(":");
  if (intervalParts.length === 2) {
    return new RationalInterval(parseRationalLiteral(intervalParts[0]), parseRationalLiteral(intervalParts[1]));
  }
  if (intervalParts.length > 2) {
    throw new Error("An interval must contain exactly two endpoints");
  }
  if (new RegExp(`^[+-]?${DIGITS}$`).test(value)) {
    return new Integer(BigInt(cleanDigits(value, { signed: true })));
  }
  return parseRationalLiteral(value);
}
function parseRational(input) {
  const value = parseNumber(input);
  if (value instanceof CertifiedApproximation) {
    return value.toRational();
  }
  if (value instanceof RationalInterval) {
    throw new Error("Expected a scalar rational number, received an interval");
  }
  return value instanceof Integer ? value.toRational() : value;
}
function parseDecimal(input) {
  const value = inputString(input, "decimal");
  if (value.includes("..") || value.includes("/") || value.includes(".~")) {
    throw new Error("Expected decimal notation");
  }
  return parseDecimalValue(value);
}
function parseRepeatingDecimal(input) {
  return parseDecimal(input);
}
function parseMixedNumber(input) {
  const value = inputString(input, "mixed number");
  if (!value.includes("..")) {
    throw new Error("Expected mixed-fraction notation 'whole..numerator/denominator'");
  }
  return parseRationalLiteral(value);
}
function parseContinuedFraction(input) {
  if (Array.isArray(input)) {
    return Rational.fromContinuedFraction(input);
  }
  const value = inputString(input, "continued fraction");
  if (!value.includes(".~")) {
    throw new Error("Expected continued-fraction notation 'a0.~a1~a2'");
  }
  return value.includes("?") ? parseApproximation(value) : parseRationalLiteral(value);
}
function parseInterval(input) {
  const value = parseNumber(input);
  if (value instanceof RationalInterval)
    return value;
  if (value instanceof CertifiedApproximation)
    return value.enclosure;
  return RationalInterval.point(value instanceof Integer ? value.toRational() : value);
}

// ../../packages/core/src/r-template.js
var LITERAL = /^(?:\d[\d_]*\.\.\d[\d_]*\/\d[\d_]*|(?:\d[\d_]*)?\.?[\d_]*(?:\{\d+~\d+\}[\d_]*)*(?:#[\d_]*(?:\{\d+~\d+\}[\d_]*)*)?(?:\[[^\]]*\])?(?:\?[\d~]*)?)/;
function tokenize(strings, values) {
  const tokens = [];
  strings.forEach((text, part) => {
    let index = 0;
    while (index < text.length) {
      const rest = text.slice(index);
      const space = rest.match(/^\s+/);
      if (space) {
        index += space[0].length;
        continue;
      }
      if (/^[\d.]/.test(rest)) {
        const literal = rest.match(LITERAL)[0];
        if (!literal || literal === ".")
          throw new SyntaxError(`R: unexpected '${rest[0]}'`);
        tokens.push({ kind: "value", value: parseNumber(literal), text: literal });
        index += literal.length;
        continue;
      }
      if ("+-*/^:()!".includes(rest[0])) {
        tokens.push({ kind: "op", value: rest[0] });
        index += 1;
        continue;
      }
      throw new SyntaxError(`R: unexpected '${rest[0]}' in \`${strings.join("${…}")}\``);
    }
    if (part < values.length)
      tokens.push({ kind: "value", value: coreValue(values[part]), text: `\${${part}}` });
  });
  return tokens;
}
function coreValue(value) {
  if (value instanceof Integer || value instanceof Rational || value instanceof RationalInterval)
    return value;
  if (value?.isCertifiedApproximation === true)
    return value;
  if (typeof value === "bigint")
    return new Integer(value);
  if (typeof value === "number" && Number.isSafeInteger(value))
    return new Integer(value);
  if (typeof value === "string")
    return parseNumber(value);
  throw new TypeError(`R: cannot use ${typeof value === "number" ? `inexact number ${value}` : typeof value} as an exact value; pass a Core value, bigint, safe integer or literal string`);
}
var toRationalish = (value) => value instanceof Integer ? value.toRational() : value;
function interval(left, right) {
  const [low, high] = [toRationalish(left), toRationalish(right)];
  if (!(low instanceof Rational) || !(high instanceof Rational))
    throw new TypeError("R: ':' joins two scalar endpoints");
  return new RationalInterval(low, high);
}
function power(base, exponent) {
  if (!(exponent instanceof Integer))
    throw new TypeError("R: '^' needs an Integer exponent (exact powers only)");
  return base.pow(exponent.value);
}
function R(strings, ...values) {
  const tokens = tokenize(strings, values);
  let position = 0;
  const peek = () => tokens[position];
  const takeOp = (ops) => peek()?.kind === "op" && ops.includes(peek().value) ? tokens[position++].value : null;
  function primary() {
    const token = tokens[position++];
    if (!token)
      throw new SyntaxError("R: expression ended early");
    if (token.kind === "value")
      return token.value;
    if (token.value === "(") {
      const value = sum();
      if (takeOp(")") === null)
        throw new SyntaxError("R: missing ')'");
      return value;
    }
    throw new SyntaxError(`R: unexpected '${token.value}'`);
  }
  function postfix() {
    let value = primary();
    while (takeOp("!") !== null) {
      if (!(value instanceof Integer))
        throw new TypeError("R: '!' needs an Integer");
      value = value.factorial();
    }
    return value;
  }
  function exponent() {
    const base = postfix();
    return takeOp("^") !== null ? power(base, unary()) : base;
  }
  function unary() {
    return takeOp("-") !== null ? unary().negate() : (takeOp("+"), exponent());
  }
  function product() {
    let value = unary();
    for (let op;(op = takeOp("*/")) !== null; )
      value = op === "*" ? value.multiply(unary()) : value.divide(unary());
    return value;
  }
  function range() {
    const value = product();
    return takeOp(":") !== null ? interval(value, product()) : value;
  }
  function sum() {
    let value = range();
    for (let op;(op = takeOp("+-")) !== null; )
      value = op === "+" ? value.add(range()) : value.subtract(range());
    return value;
  }
  const result = sum();
  if (position < tokens.length)
    throw new SyntaxError(`R: unexpected '${peek().value ?? peek().text}'`);
  return result;
}

// ../../packages/core/src/core-values.js
var isInteger = (value) => value instanceof Integer;
var isRational = (value) => value instanceof Rational;
var isRationalInterval = (value) => value instanceof RationalInterval;
var isRationalIntervalSet = (value) => value instanceof RationalIntervalSet;
var isCertifiedApproximation = (value) => value instanceof CertifiedApproximation;
var isFraction = (value) => value instanceof Fraction;
var isFractionInterval = (value) => value instanceof FractionInterval;
var isBaseSystem = (value) => value instanceof BaseSystem;
var isCoreNumber = (value) => isInteger(value) || isRational(value) || isRationalInterval(value) || isCertifiedApproximation(value);
function reviveCoreValue(_key, value) {
  if (!value || typeof value !== "object" || typeof value.$ratmath !== "string") {
    return value;
  }
  switch (value.$ratmath) {
    case "Integer":
      return new Integer(value.value);
    case "Rational":
      return new Rational(value.numerator, value.denominator);
    case "RationalInterval":
      return new RationalInterval(value.start, value.end);
    case "RationalIntervalSet":
      if (value.version !== undefined && value.version !== 1) {
        throw new Error(`Unsupported RationalIntervalSet JSON version: ${value.version}`);
      }
      return new RationalIntervalSet(value.components);
    case "CertifiedApproximation":
      return new CertifiedApproximation(value.candidate, value.enclosure, {
        representation: value.representation,
        sourceId: value.sourceId ?? undefined,
        dependencies: value.dependencies ?? []
      });
    case "Fraction":
      return new Fraction(value.numerator, value.denominator, {
        allowInfinite: value.denominator === "0"
      });
    case "FractionInterval":
      return new FractionInterval(value.low, value.high);
    case "BaseSystem":
      return new BaseSystem(value.characters, value.name, {
        radix: value.radix,
        digitOffset: value.digitOffset,
        allowReserved: value.allowReserved
      });
    default:
      return value;
  }
}

// ../../packages/core/index.js
var core_default = {
  Rational,
  RationalInterval,
  RationalIntervalSet,
  RANGE_ARITHMETIC_CHECKER_ID,
  RANGE_OPERATION_RESULT_SCHEMA,
  asRationalIntervalSet,
  checkRangeOperationResult,
  rangeAbsoluteValue,
  rangeAdd,
  rangeDivide,
  rangeIntegerPower,
  rangeMultiply,
  rangeNegate,
  rangeReciprocal,
  rangeSubtract,
  Fraction,
  FractionInterval,
  Integer,
  TypePromotion,
  BaseSystem,
  NumeralSystem,
  NUMERAL_SYSTEM_SCHEMA,
  NUMERAL_LIMITS,
  CertifiedApproximation,
  Relation,
  boundedContinuedFractionApproximation,
  boundedDecimalApproximation,
  certifiedContinuedFractionPrefix,
  certifiedRadixPrefix,
  normalizeCertifiedApproximation,
  possibleRelations,
  parseContinuedFraction,
  parseCertifiedApproximation: parseApproximation,
  parseDecimal,
  parseInterval,
  parseMixedNumber,
  parseNumber,
  parseRational,
  parseRepeatingDecimal,
  R,
  isBaseSystem,
  isCertifiedApproximation,
  isCoreNumber,
  isFraction,
  isFractionInterval,
  isInteger,
  isRational,
  isRationalInterval,
  isRationalIntervalSet,
  reviveCoreValue
};

// ../calc/src/session.js
var { Integer: Integer2, Rational: Rational2, RationalInterval: RationalInterval2 } = exports_core;
var BLOCKED = new Set([
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "Worker",
  "SharedWorker",
  "importScripts",
  "require",
  "process",
  "Bun",
  "Deno",
  "navigator",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "document",
  "window",
  "self",
  "top",
  "parent",
  "globalThis",
  "global",
  "opener",
  "frames"
]);
var DISPLAY_MODES = ["both", "exact", "decimal", "mixed", "cf"];
function rewriteDeclarations(source) {
  let out = "";
  let depth = 0;
  let statementStart = true;
  for (let i = 0;i < source.length; ) {
    const ch = source[i];
    const two = source.slice(i, i + 2);
    if (two === "//") {
      const end = source.indexOf(`
`, i);
      const stop = end === -1 ? source.length : end;
      out += source.slice(i, stop);
      i = stop;
      continue;
    }
    if (two === "/*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const stop = skipString(source, i);
      out += source.slice(i, stop);
      i = stop;
      statementStart = false;
      continue;
    }
    if (depth === 0 && statementStart) {
      const rest = source.slice(i);
      const declaration = rest.match(/^(let|const|var)\s+(?=[[{A-Za-z_$])/);
      if (declaration) {
        const after = rest.slice(declaration[0].length);
        if (after.startsWith("{")) {
          const end = findStatementEnd(source, i + declaration[0].length);
          out += `(${source.slice(i + declaration[0].length, end)})`;
          i = end;
          statementStart = false;
          continue;
        }
        i += declaration[0].length;
        statementStart = false;
        continue;
      }
      const named = rest.match(/^(async\s+function\*?|function\*?|class)\s+([A-Za-z_$][\w$]*)/);
      if (named) {
        const end = findBlockEnd(source, i);
        out += `${named[2]} = ${source.slice(i, end)};`;
        i = end;
        statementStart = true;
        continue;
      }
    }
    if (ch === "{" || ch === "(" || ch === "[")
      depth += 1;
    if (ch === "}" || ch === ")" || ch === "]")
      depth = Math.max(0, depth - 1);
    if (!/\s/.test(ch))
      statementStart = depth === 0 && (ch === ";" || ch === "}") ? true : false;
    if (ch === `
` && depth === 0)
      statementStart = true;
    out += ch;
    i += 1;
  }
  return out;
}
function skipString(source, start) {
  const quote = source[start];
  let i = start + 1;
  let depth = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (quote === "`" && ch === "$" && source[i + 1] === "{") {
      depth += 1;
      i += 2;
      continue;
    }
    if (quote === "`" && depth > 0) {
      if (ch === "}")
        depth -= 1;
      else if (ch === "`" || ch === '"' || ch === "'") {
        i = skipString(source, i);
        continue;
      }
      i += 1;
      continue;
    }
    if (ch === quote)
      return i + 1;
    i += 1;
  }
  return i;
}
function findStatementEnd(source, start) {
  let depth = 0;
  for (let i = start;i < source.length; ) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(source, i);
      continue;
    }
    if (ch === "{" || ch === "(" || ch === "[")
      depth += 1;
    if (ch === "}" || ch === ")" || ch === "]")
      depth -= 1;
    if (depth === 0 && (ch === ";" || ch === `
`))
      return i;
    i += 1;
  }
  return source.length;
}
function findBlockEnd(source, start) {
  let depth = 0;
  let opened = false;
  for (let i = start;i < source.length; ) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(source, i);
      continue;
    }
    if (ch === "{") {
      depth += 1;
      opened = true;
    }
    if (ch === "}") {
      depth -= 1;
      if (opened && depth === 0)
        return i + 1;
    }
    i += 1;
  }
  return source.length;
}
function isCore(value) {
  return value instanceof Integer2 || value instanceof Rational2 || value instanceof RationalInterval2 || value?.isCertifiedApproximation === true || value instanceof Fraction || value instanceof FractionInterval || value instanceof RationalIntervalSet;
}
var plainDecimal = (text) => text?.replace(/#0(?=$|:)/g, "") ?? null;
function repeating(rational, digits) {
  try {
    return plainDecimal(rational.toRepeatingDecimal(digits, "trunc"));
  } catch {
    return null;
  }
}
function formatRational(value, mode, digits) {
  const exact = value.toString();
  if (value.denominator === 1n)
    return exact;
  if (mode === "exact")
    return exact;
  const decimal = repeating(value, digits) ?? value.toDecimal(digits);
  if (mode === "decimal")
    return decimal;
  if (mode === "mixed")
    return value.toMixedString();
  if (mode === "cf")
    return value.toContinuedFractionString();
  return decimal === exact ? exact : `${exact} = ${decimal}`;
}
function formatValue(value, options = {}) {
  const { mode = "both", digits = 30, depth = 0 } = options;
  if (value instanceof Rational2)
    return formatRational(value, mode, digits);
  if (value instanceof Integer2)
    return value.toString();
  if (value instanceof RationalInterval2) {
    const exact = `${value.low.toString()}:${value.high.toString()}`;
    if (mode === "exact" || value.low.denominator === 1n && value.high.denominator === 1n)
      return exact;
    const decimal = plainDecimal(value.toRepeatingDecimal({ limit: digits })) ?? `${value.low.toDecimal(digits)}:${value.high.toDecimal(digits)}`;
    if (mode === "decimal")
      return decimal;
    return decimal === exact ? exact : `${exact} = ${decimal}`;
  }
  if (isCore(value))
    return value.toString();
  if (value === undefined)
    return "undefined";
  if (value === null)
    return "null";
  if (typeof value === "string")
    return depth === 0 ? value : JSON.stringify(value);
  if (typeof value === "bigint")
    return `${value}n`;
  if (typeof value === "number")
    return Number.isInteger(value) || !Number.isFinite(value) ? String(value) : `${value} (inexact JS number; R\`…\` keeps it exact)`;
  if (typeof value === "function")
    return `[function ${value.name || "anonymous"}]`;
  if (typeof value === "symbol" || typeof value === "boolean")
    return String(value);
  if (depth > 3)
    return Array.isArray(value) ? "[…]" : "{…}";
  const inner = { mode: mode === "both" ? "exact" : mode, digits, depth: depth + 1 };
  if (Array.isArray(value))
    return `[${value.map((item) => formatValue(item, inner)).join(", ")}]`;
  if (value instanceof Map)
    return `Map {${[...value].map(([k, v]) => `${formatValue(k, inner)} => ${formatValue(v, inner)}`).join(", ")}}`;
  if (value instanceof Set)
    return `Set {${[...value].map((item) => formatValue(item, inner)).join(", ")}}`;
  if (value instanceof Error)
    return `${value.name}: ${value.message}`;
  const entries = Object.entries(value);
  return `{${entries.map(([k, v]) => `${k}: ${formatValue(v, inner)}`).join(", ")}}`;
}
var HELP_TEXT = `RatCalc is JavaScript with exact rational arithmetic.
Type any JavaScript; the last expression's value is shown.

  R\`1/3 + 1/6\`            exact arithmetic on Core literals -> 1/2
  R\`1:2 + 3\`              intervals -> 4:5
  x = R\`2/3\`; R\`\${x}^2\`  interpolated values stay exact -> 4/9
  new Rational(1, 7)       Core classes: Integer, Rational, RationalInterval, ...
  parseNumber("0.#142857") Core parsers: parseNumber, parseInterval, ...
  [1, 2, 3].map(n => R\`1/\${n}\`)  plain JavaScript works around R
  let total = R\`0\`         declarations persist between inputs
  ans                      the previous result

R literals: 3, -2, 1/2, 1..3/4, 0.#3, 1.23[56:67], 1_000, 1.5? ; operators + - * / ^ ! :
Display: display("both" | "exact" | "decimal" | "mixed" | "cf"), digits(n)
Commands: help(), vars(), clear()   (terminal: .help .vars .clear .exit)
JavaScript numbers like 0.1 are inexact; results that are plain numbers say so.`;
function createSession(options = {}) {
  const settings = { mode: "both", digits: 30 };
  const variables = new Map;
  const blocked = new Set([...BLOCKED, ...options.blocked ?? []]);
  const actions = { clear: options.onClear ?? (() => {}) };
  const builtins = {
    ...exports_core,
    R,
    help: () => HELP_TEXT,
    display(mode) {
      if (mode === undefined)
        return settings.mode;
      if (!DISPLAY_MODES.includes(mode))
        throw new Error(`display mode must be one of ${DISPLAY_MODES.join(", ")}`);
      settings.mode = mode;
      return `display ${mode}`;
    },
    digits(n) {
      if (n === undefined)
        return settings.digits;
      if (!Number.isSafeInteger(n) || n < 1 || n > 1e4)
        throw new Error("digits(n) needs a whole number from 1 to 10000");
      settings.digits = n;
      return `digits ${n}`;
    },
    vars: () => [...variables.keys()].filter((name) => name !== "ans").map((name) => `${name} = ${formatValue(variables.get(name), settings)}`).join(`
`) || "(no variables)",
    clear() {
      variables.clear();
      actions.clear();
      return "cleared";
    },
    show: (value) => formatValue(value, settings)
  };
  const scope = new Proxy(variables, {
    has(_target, name) {
      if (typeof name !== "string")
        return false;
      if (name === "eval" || name === "__ratcalcSource")
        return false;
      if (blocked.has(name) || variables.has(name) || Object.hasOwn(builtins, name))
        return true;
      return !(name in globalThis);
    },
    get(_target, name) {
      if (name === Symbol.unscopables)
        return;
      if (blocked.has(name))
        throw new ReferenceError(`${String(name)} is not available in RatCalc`);
      if (variables.has(name))
        return variables.get(name);
      if (Object.hasOwn(builtins, name))
        return builtins[name];
      throw new ReferenceError(`${String(name)} is not defined`);
    },
    set(_target, name, value) {
      if (blocked.has(name))
        throw new ReferenceError(`${String(name)} is not available in RatCalc`);
      variables.set(name, value);
      return true;
    },
    deleteProperty(_target, name) {
      return variables.delete(name);
    }
  });
  const run = new Function("__ratcalcScope", "__ratcalcSource", "with (__ratcalcScope) { return eval(__ratcalcSource); }");
  function evaluate(source) {
    const code = String(source ?? "");
    try {
      if (/\bimport\s*[(\s{*]|\bimport\.meta\b|\bexport\s/.test(code.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, ""))) {
        throw new SyntaxError("import and export are not available in RatCalc");
      }
      const value = run(scope, rewriteDeclarations(code));
      if (value !== undefined)
        variables.set("ans", value);
      return { ok: true, value, text: formatValue(value, settings) };
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      return { ok: false, error, text: message };
    }
  }
  return { evaluate, settings, variables, format: (value) => formatValue(value, settings) };
}

// src/IntervalVisualization.js
class IntervalVisualization {
  constructor(container, options = {}) {
    this.container = container;
    this.width = options.width || 800;
    this.height = options.height || 250;
    this.margin = options.margin || { top: 60, right: 60, bottom: 80, left: 60 };
    this.plotWidth = this.width - this.margin.left - this.margin.right;
    this.plotHeight = this.height - this.margin.top - this.margin.bottom;
    this.intervals = [];
    this.range = { min: new Rational(-10), max: new Rational(10) };
    this.autoRange = true;
    this.dragStepSize = new Rational(1, 10);
    this.selectedIntervalId = null;
    this.selectedEndpoint = null;
    this.selectableElements = [];
    this.recentlyDragged = false;
    this.colors = ["#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed"];
    this.colorIndex = 0;
    this.initializeSVG();
  }
  initializeSVG() {
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("width", this.width);
    this.svg.setAttribute("height", this.height);
    this.svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);
    this.svg.style.border = "1px solid #e5e7eb";
    this.svg.style.borderRadius = "8px";
    this.svg.style.background = "white";
    this.svg.style.minWidth = `${this.width}px`;
    this.svg.style.display = "block";
    this.plotGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.plotGroup.setAttribute("transform", `translate(${this.margin.left}, ${this.margin.top})`);
    this.svg.appendChild(this.plotGroup);
    this.axisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.plotGroup.appendChild(this.axisGroup);
    this.intervalsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.plotGroup.appendChild(this.intervalsGroup);
    this.tooltip = document.createElement("div");
    this.tooltip.style.position = "absolute";
    this.tooltip.style.background = "rgba(0, 0, 0, 0.8)";
    this.tooltip.style.color = "white";
    this.tooltip.style.padding = "8px 12px";
    this.tooltip.style.borderRadius = "4px";
    this.tooltip.style.fontSize = "12px";
    this.tooltip.style.pointerEvents = "none";
    this.tooltip.style.opacity = "0";
    this.tooltip.style.transition = "opacity 0.2s";
    this.tooltip.style.zIndex = "1000";
    document.body.appendChild(this.tooltip);
    this.container.appendChild(this.svg);
    this.renderAxis();
  }
  xScale(value) {
    const range = this.range.max.subtract(this.range.min);
    const position = value.subtract(this.range.min);
    return position.toDecimal() / range.toDecimal() * this.plotWidth;
  }
  updateRange() {
    if (!this.autoRange || this.intervals.length === 0)
      return;
    let min = null;
    let max = null;
    for (const intervalData of this.intervals) {
      const interval = intervalData.interval;
      if (min === null || interval.low.lessThan(min)) {
        min = interval.low;
      }
      if (max === null || interval.high.greaterThan(max)) {
        max = interval.high;
      }
    }
    if (min !== null && max !== null) {
      const range = max.subtract(min);
      const padding = range.multiply(new Rational(1, 20));
      const minPadding = new Rational(1, 2);
      const actualPadding = padding.lessThan(minPadding) ? minPadding : padding;
      this.range.min = min.subtract(actualPadding);
      this.range.max = max.add(actualPadding);
    }
  }
  renderAxis() {
    this.axisGroup.innerHTML = "";
    const axisLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axisLine.setAttribute("x1", 0);
    axisLine.setAttribute("y1", this.plotHeight / 2);
    axisLine.setAttribute("x2", this.plotWidth);
    axisLine.setAttribute("y2", this.plotHeight / 2);
    axisLine.setAttribute("stroke", "#374151");
    axisLine.setAttribute("stroke-width", "2");
    this.axisGroup.appendChild(axisLine);
    this.generateTicks();
  }
  generateTicks() {
    const range = this.range.max.subtract(this.range.min);
    const rangeDecimal = parseFloat(range.toDecimal());
    let tickSpacing;
    if (rangeDecimal <= 2) {
      tickSpacing = new Rational(1, 4);
    } else if (rangeDecimal <= 10) {
      tickSpacing = new Rational(1);
    } else if (rangeDecimal <= 50) {
      tickSpacing = new Rational(5);
    } else {
      tickSpacing = new Rational(10);
    }
    const minDivided = this.range.min.divide(tickSpacing);
    const firstTickMultiplier = new Rational(Math.ceil(parseFloat(minDivided.toDecimal())));
    const firstTick = firstTickMultiplier.multiply(tickSpacing);
    let currentTick = firstTick;
    while (currentTick.lessThanOrEqual(this.range.max)) {
      const x = this.xScale(currentTick);
      const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
      tick.setAttribute("x1", x);
      tick.setAttribute("y1", this.plotHeight / 2 - 8);
      tick.setAttribute("x2", x);
      tick.setAttribute("y2", this.plotHeight / 2 + 8);
      tick.setAttribute("stroke", "#374151");
      tick.setAttribute("stroke-width", "1");
      this.axisGroup.appendChild(tick);
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", x);
      label.setAttribute("y", this.plotHeight / 2 + 25);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("font-size", "12");
      label.setAttribute("font-family", "monospace");
      label.setAttribute("fill", "#374151");
      const labelText = this.formatTickLabel(currentTick);
      label.textContent = labelText;
      this.axisGroup.appendChild(label);
      currentTick = currentTick.add(tickSpacing);
    }
  }
  formatTickLabel(rational) {
    const decimal = rational.toDecimal();
    if (decimal.length <= 4 && !decimal.includes("...")) {
      return decimal;
    } else {
      return rational.toString();
    }
  }
  addInterval(interval, options = {}) {
    let color = options.color || this.colors[this.colorIndex % this.colors.length];
    if (!options.draggable && !options.isResult) {
      color = this.makePaleColor(color);
    }
    const intervalData = {
      interval,
      color,
      label: options.label || `Interval ${this.intervals.length + 1}`,
      id: options.id || `interval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      draggable: options.draggable !== false,
      isResult: options.isResult || false
    };
    this.intervals.push(intervalData);
    this.colorIndex++;
    this.updateRange();
    this.renderAxis();
    this.renderIntervals();
    return intervalData.id;
  }
  removeInterval(id) {
    this.intervals = this.intervals.filter((interval) => interval.id !== id);
    this.updateRange();
    this.renderAxis();
    this.renderIntervals();
  }
  clearIntervals() {
    this.intervals = [];
    this.colorIndex = 0;
    this.updateRange();
    this.renderAxis();
    this.renderIntervals();
  }
  renderIntervals() {
    const wasSelected = this.selectedIntervalId;
    const wasSelectedEndpoint = this.selectedEndpoint;
    this.intervalsGroup.innerHTML = "";
    this.selectableElements = [];
    this.intervals.forEach((intervalData, index) => {
      this.renderInterval(intervalData, index);
    });
    if (!wasSelected && this.selectableElements.length > 0) {
      const firstInputElement = this.selectableElements.find((sel) => sel.endpointType === "left" && this.intervals.find((iv) => iv.id === sel.intervalId)?.draggable);
      if (firstInputElement) {
        setTimeout(() => {
          this.selectElement(firstInputElement.intervalId, firstInputElement.endpointType);
        }, 0);
      }
    } else if (wasSelected && wasSelectedEndpoint) {
      setTimeout(() => {
        this.selectElement(wasSelected, wasSelectedEndpoint);
      }, 0);
    }
  }
  renderInterval(intervalData, index) {
    const { interval, color, label, id, draggable, isResult } = intervalData;
    const operandIndex = this.intervals.filter((iv, i) => i < index && !iv.isResult).length;
    const resultIndex = this.intervals.filter((iv, i) => i < index && iv.isResult).length;
    const y = isResult ? this.plotHeight / 2 + 45 + resultIndex * 30 : this.plotHeight / 2 - 15 - operandIndex * 30;
    const intervalGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    intervalGroup.setAttribute("data-interval-id", id);
    const x1 = this.xScale(interval.low);
    const x2 = this.xScale(interval.high);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "4");
    line.setAttribute("stroke-linecap", "round");
    if (draggable) {
      line.style.cursor = "move";
    }
    intervalGroup.appendChild(line);
    const leftPoint = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    leftPoint.setAttribute("cx", x1);
    leftPoint.setAttribute("cy", y);
    leftPoint.setAttribute("r", "6");
    leftPoint.setAttribute("fill", color);
    leftPoint.setAttribute("stroke", "white");
    leftPoint.setAttribute("stroke-width", "2");
    if (draggable) {
      leftPoint.style.cursor = "ew-resize";
      leftPoint.setAttribute("data-endpoint", "low");
    }
    intervalGroup.appendChild(leftPoint);
    const rightPoint = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    rightPoint.setAttribute("cx", x2);
    rightPoint.setAttribute("cy", y);
    rightPoint.setAttribute("r", "6");
    rightPoint.setAttribute("fill", color);
    rightPoint.setAttribute("stroke", "white");
    rightPoint.setAttribute("stroke-width", "2");
    if (draggable) {
      rightPoint.style.cursor = "ew-resize";
      rightPoint.setAttribute("data-endpoint", "high");
    }
    intervalGroup.appendChild(rightPoint);
    const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelText.setAttribute("x", (x1 + x2) / 2);
    labelText.setAttribute("y", isResult ? y + 25 : y - 15);
    labelText.setAttribute("text-anchor", "middle");
    labelText.setAttribute("font-size", "12");
    labelText.setAttribute("font-family", "monospace");
    labelText.setAttribute("fill", color);
    labelText.setAttribute("font-weight", "bold");
    labelText.setAttribute("class", "interval-label");
    labelText.textContent = label;
    intervalGroup.appendChild(labelText);
    this.addTooltipHandlers(intervalGroup, intervalData);
    if (draggable) {
      this.addInteractionHandlers(intervalGroup, intervalData);
    }
    this.intervalsGroup.appendChild(intervalGroup);
  }
  updateIntervalLabel(intervalData) {
    const labelElement = this.svg.querySelector(`g[data-interval-id="${intervalData.id}"] .interval-label`);
    if (labelElement) {
      const originalLabel = intervalData.label.split(" [")[0];
      labelElement.textContent = `${originalLabel} [${intervalData.interval.low.toString()}:${intervalData.interval.high.toString()}]`;
    }
  }
  addTooltipHandlers(element, intervalData) {
    const showTooltip = (e) => {
      const { interval, label } = intervalData;
      const content = `${label}<br/>Range: [${interval.low.toString()}, ${interval.high.toString()}]<br/>Width: ${interval.high.subtract(interval.low).toString()}`;
      this.tooltip.innerHTML = content;
      this.tooltip.style.opacity = "1";
      this.tooltip.style.left = e.pageX + 10 + "px";
      this.tooltip.style.top = e.pageY - 10 + "px";
    };
    const hideTooltip = () => {
      this.tooltip.style.opacity = "0";
    };
    element.addEventListener("mouseenter", showTooltip);
    element.addEventListener("mouseleave", hideTooltip);
    element.addEventListener("mousemove", showTooltip);
  }
  addInteractionHandlers(intervalGroup, intervalData) {
    const line = intervalGroup.querySelector("line");
    const leftPoint = intervalGroup.querySelector('[data-endpoint="low"]');
    const rightPoint = intervalGroup.querySelector('[data-endpoint="high"]');
    this.setupElementInteraction(leftPoint, intervalData, "left");
    this.setupElementInteraction(line, intervalData, "interval");
    this.setupElementInteraction(rightPoint, intervalData, "right");
  }
  setupElementInteraction(element, intervalData, endpointType) {
    if (!element)
      return;
    element.setAttribute("tabindex", "0");
    element.style.outline = "none";
    element.dataset.intervalId = intervalData.id;
    element.dataset.endpointType = endpointType;
    this.selectableElements.push({
      element,
      intervalId: intervalData.id,
      endpointType
    });
    let isDragging = false;
    let dragStartX = 0;
    let dragStartMouseX = 0;
    let hasDragged = false;
    let initialLow = null;
    let initialHigh = null;
    element.addEventListener("mousedown", (e) => {
      isDragging = true;
      dragStartMouseX = e.clientX;
      hasDragged = false;
      e.preventDefault();
      this.tooltip.style.opacity = "0";
      if (endpointType === "interval") {
        initialLow = intervalData.interval.low;
        initialHigh = intervalData.interval.high;
      } else if (endpointType === "left") {
        const rect = this.svg.getBoundingClientRect();
        dragStartX = this.xScale(intervalData.interval.low) + this.margin.left + rect.left;
      } else if (endpointType === "right") {
        const rect = this.svg.getBoundingClientRect();
        dragStartX = this.xScale(intervalData.interval.high) + this.margin.left + rect.left;
      }
      this.selectElement(intervalData.id, endpointType);
    });
    const handleMouseMove = (e) => {
      if (!isDragging)
        return;
      this.tooltip.style.opacity = "0";
      const dragDistance = Math.abs(e.clientX - dragStartMouseX);
      if (dragDistance > 3) {
        hasDragged = true;
        if (endpointType === "interval") {
          this.performIntervalDrag(e, intervalData, dragStartMouseX, initialLow, initialHigh);
        } else {
          this.performEndpointDrag(e, intervalData, endpointType);
        }
      }
    };
    const handleMouseUp = (e) => {
      if (isDragging) {
        isDragging = false;
        if (hasDragged) {
          this.adjustRangeAfterDrag(intervalData);
        }
        initialLow = null;
        initialHigh = null;
        if (!hasDragged) {}
      }
    };
    element.addEventListener("focus", () => {
      this.selectElement(intervalData.id, endpointType);
    });
    element.addEventListener("keydown", (e) => {
      if (this.selectedIntervalId === intervalData.id && this.selectedEndpoint === endpointType) {
        this.handleEndpointKeydown(e, intervalData.id, endpointType);
      }
    });
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }
  performIntervalDrag(e, intervalData, dragStartMouseX, initialLow, initialHigh) {
    const totalDragDistance = e.clientX - dragStartMouseX;
    const range = this.range.max.subtract(this.range.min);
    const dragValueNumerator = totalDragDistance;
    const dragValueDenominator = this.plotWidth;
    const pixelRatio = new Rational(dragValueNumerator, dragValueDenominator);
    const dragValue = range.multiply(pixelRatio);
    const quantizedDragValue = this.quantizeValue(dragValue);
    const newLow = initialLow.add(quantizedDragValue);
    const newHigh = initialHigh.add(quantizedDragValue);
    intervalData.interval = new RationalInterval(newLow, newHigh);
    this.updateIntervalAfterChange(intervalData, this.intervals.length === 1);
  }
  adjustRangeAfterDrag(intervalData) {
    const interval = intervalData.interval;
    const currentRange = this.range.max.subtract(this.range.min);
    const leftPosition = this.xScale(interval.low);
    const rightPosition = this.xScale(interval.high);
    const margin = this.plotWidth * 0.1;
    if (leftPosition < margin || rightPosition > this.plotWidth - margin || leftPosition < 0 || rightPosition > this.plotWidth) {
      if (this.intervals.length === 1) {
        const intervalCenter = interval.low.add(interval.high).divide(new Rational(2));
        const halfRange = currentRange.divide(new Rational(2));
        this.range.min = intervalCenter.subtract(halfRange);
        this.range.max = intervalCenter.add(halfRange);
      } else {
        this.updateRange();
      }
      this.renderAxis();
      this.renderIntervals();
    }
  }
  performEndpointDrag(e, intervalData, endpointType) {
    const rect = this.svg.getBoundingClientRect();
    const x = e.clientX - rect.left - this.margin.left;
    const newRange = this.range.max.subtract(this.range.min);
    const positionRatio = Math.max(0, Math.min(1, x / this.plotWidth));
    const position = new Rational(positionRatio.toString());
    const rawValue = this.range.min.add(newRange.multiply(position));
    const newValue = this.quantizeValue(rawValue);
    if (endpointType === "left") {
      if (newValue.lessThanOrEqual(intervalData.interval.high)) {
        intervalData.interval = new RationalInterval(newValue, intervalData.interval.high);
      }
    } else if (endpointType === "right") {
      if (newValue.greaterThanOrEqual(intervalData.interval.low)) {
        intervalData.interval = new RationalInterval(intervalData.interval.low, newValue);
      }
    }
    this.updateIntervalAfterChange(intervalData, this.intervals.length === 1);
  }
  selectElement(intervalId, endpointType) {
    this.clearSelection();
    this.selectedIntervalId = intervalId;
    this.selectedEndpoint = endpointType;
    const element = this.findSelectableElement(intervalId, endpointType);
    if (element) {
      if (endpointType === "left" || endpointType === "right") {
        element.style.filter = "drop-shadow(0 0 8px rgba(37, 99, 235, 0.9))";
        element.style.strokeWidth = "3";
      } else {
        const intervalGroup = element.closest("g[data-interval-id]");
        if (intervalGroup) {
          intervalGroup.style.filter = "drop-shadow(0 0 5px rgba(37, 99, 235, 0.7))";
        }
      }
      element.focus();
    }
  }
  clearSelection() {
    if (this.selectedIntervalId && this.selectedEndpoint) {
      const element = this.findSelectableElement(this.selectedIntervalId, this.selectedEndpoint);
      if (element) {
        if (this.selectedEndpoint === "left" || this.selectedEndpoint === "right") {
          element.style.filter = "none";
          element.style.strokeWidth = "2";
        } else {
          const intervalGroup = element.closest("g[data-interval-id]");
          if (intervalGroup) {
            intervalGroup.style.filter = "none";
          }
        }
      }
    }
  }
  findSelectableElement(intervalId, endpointType) {
    return this.selectableElements.find((sel) => sel.intervalId === intervalId && sel.endpointType === endpointType)?.element;
  }
  handleEndpointKeydown(e, intervalId, endpointType) {
    const intervalData = this.intervals.find((iv) => iv.id === intervalId);
    if (!intervalData || !intervalData.draggable)
      return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      const stepSize = this.dragStepSize;
      const direction = e.key === "ArrowLeft" ? -1 : 1;
      const stepValue = stepSize.multiply(new Rational(direction));
      if (endpointType === "left") {
        const newLow = intervalData.interval.low.add(stepValue);
        if (newLow.lessThanOrEqual(intervalData.interval.high)) {
          intervalData.interval = new RationalInterval(newLow, intervalData.interval.high);
          this.updateIntervalAfterChange(intervalData);
        }
      } else if (endpointType === "right") {
        const newHigh = intervalData.interval.high.add(stepValue);
        if (newHigh.greaterThanOrEqual(intervalData.interval.low)) {
          intervalData.interval = new RationalInterval(intervalData.interval.low, newHigh);
          this.updateIntervalAfterChange(intervalData);
        }
      } else if (endpointType === "interval") {
        const newLow = intervalData.interval.low.add(stepValue);
        const newHigh = intervalData.interval.high.add(stepValue);
        intervalData.interval = new RationalInterval(newLow, newHigh);
        this.updateIntervalAfterChange(intervalData);
      }
    } else if (e.key === "Tab") {
      this.handleTabNavigation(e, intervalId, endpointType);
    }
  }
  handleTabNavigation(e, intervalId, endpointType) {
    const currentIndex = this.selectableElements.findIndex((sel) => sel.intervalId === intervalId && sel.endpointType === endpointType);
    if (currentIndex === -1)
      return;
    let targetIndex;
    if (e.shiftKey) {
      targetIndex = currentIndex > 0 ? currentIndex - 1 : this.selectableElements.length - 1;
    } else {
      targetIndex = currentIndex < this.selectableElements.length - 1 ? currentIndex + 1 : 0;
    }
    const targetElement = this.selectableElements[targetIndex];
    if (targetElement) {
      e.preventDefault();
      this.selectElement(targetElement.intervalId, targetElement.endpointType);
    }
  }
  makePaleColor(color) {
    const colorMap = {
      "#2563eb": "#93c5fd",
      "#dc2626": "#fca5a5",
      "#059669": "#86efac",
      "#d97706": "#fcd34d",
      "#7c3aed": "#c4b5fd"
    };
    return colorMap[color] || color;
  }
  formatRationalAsMixed(rational) {
    if (rational.toMixed) {
      try {
        return rational.toMixed();
      } catch (e) {
        return rational.toString();
      }
    } else {
      try {
        const numeratorStr = rational.toString();
        if (numeratorStr.includes("/")) {
          const [num, den] = numeratorStr.split("/");
          const numerator = BigInt(num);
          const denominator = BigInt(den);
          if (denominator === 1n) {
            return numerator.toString();
          }
          const wholePart = numerator / denominator;
          const remainder = numerator % denominator;
          if (wholePart === 0n) {
            return `${remainder}/${denominator}`;
          } else if (remainder === 0n) {
            return wholePart.toString();
          } else {
            const absRemainder = remainder < 0n ? -remainder : remainder;
            return `${wholePart}..${absRemainder}/${denominator}`;
          }
        } else {
          return numeratorStr;
        }
      } catch (e) {
        return rational.toString();
      }
    }
  }
  quantizeValue(value) {
    const divided = value.divide(this.dragStepSize);
    const rounded = new Rational(Math.round(parseFloat(divided.toDecimal())));
    return rounded.multiply(this.dragStepSize);
  }
  setDragStepSize(stepSize) {
    this.dragStepSize = stepSize;
  }
  handleIntervalKeydown(e, intervalData) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const stepSize = this.dragStepSize;
      const newLow = intervalData.interval.low.subtract(stepSize);
      const newHigh = intervalData.interval.high.subtract(stepSize);
      intervalData.interval = new RationalInterval(newLow, newHigh);
      this.updateIntervalAfterChange(intervalData);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const stepSize = this.dragStepSize;
      const newLow = intervalData.interval.low.add(stepSize);
      const newHigh = intervalData.interval.high.add(stepSize);
      intervalData.interval = new RationalInterval(newLow, newHigh);
      this.updateIntervalAfterChange(intervalData);
    }
  }
  updateIntervalAfterChange(intervalData, skipRangeUpdate = false) {
    const originalLabel = intervalData.label.split(" [")[0];
    intervalData.label = `${originalLabel} [${this.formatRationalAsMixed(intervalData.interval.low)}:${this.formatRationalAsMixed(intervalData.interval.high)}]`;
    const wasSelected = this.selectedIntervalId === intervalData.id;
    const wasSelectedEndpoint = this.selectedEndpoint;
    if (!skipRangeUpdate) {
      this.updateRange();
    }
    this.renderAxis();
    const intervalElement = this.svg.querySelector(`g[data-interval-id="${intervalData.id}"]`);
    if (intervalElement) {
      this.selectableElements = this.selectableElements.filter((sel) => sel.intervalId !== intervalData.id);
      intervalElement.remove();
      const index = this.intervals.findIndex((iv) => iv.id === intervalData.id);
      this.renderInterval(intervalData, index);
      if (wasSelected && wasSelectedEndpoint) {
        requestAnimationFrame(() => {
          this.selectElement(intervalData.id, wasSelectedEndpoint);
        });
      }
    } else {
      this.renderIntervals();
    }
    this.dispatchEvent("intervalChange", {
      id: intervalData.id,
      interval: intervalData.interval
    });
  }
  dispatchEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    this.container.dispatchEvent(event);
  }
  setRange(min, max) {
    this.range.min = min;
    this.range.max = max;
    this.autoRange = false;
    this.renderAxis();
    this.renderIntervals();
  }
  enableAutoRange() {
    this.autoRange = true;
    this.updateRange();
    this.renderAxis();
    this.renderIntervals();
  }
  exportSVG() {
    const svgClone = this.svg.cloneNode(true);
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgClone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    svgClone.setAttribute("version", "1.1");
    const leftExtent = 0;
    const rightExtent = this.width;
    const topExtent = 0;
    const bottomExtent = this.height;
    const padding = 60;
    const exportWidth = rightExtent - leftExtent + padding * 2;
    const exportHeight = bottomExtent - topExtent + padding * 2;
    svgClone.setAttribute("width", exportWidth);
    svgClone.setAttribute("height", exportHeight);
    svgClone.setAttribute("viewBox", `${leftExtent - padding} ${topExtent - padding} ${exportWidth} ${exportHeight}`);
    const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleElement.textContent = `
      <![CDATA[
      text { 
        font-family: "SF Mono", "Monaco", "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
        font-size: 12px;
        fill: #374151;
      }
      line { 
        stroke-linecap: round; 
      }
      circle {
        stroke-width: 2;
      }
      .tooltip { 
        display: none; 
      }
      ]]>
    `;
    svgClone.insertBefore(styleElement, svgClone.firstChild);
    const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
    return xmlDeclaration + `
` + svgClone.outerHTML;
  }
  destroy() {
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
  }
}

// src/web-calc.js
class WebCalculator {
  constructor(root = document) {
    this.root = root;
    this.history = [];
    this.historyIndex = -1;
    this.transcript = [];
    this.mobileInput = "";
    this.visualization = null;
    this.session = createSession({ onClear: () => this.clearOutput() });
    this.elements();
    this.listen();
    this.displayWelcome();
  }
  $(id) {
    return this.root.getElementById(id);
  }
  elements() {
    this.input = this.$("calculatorInput");
    this.output = this.$("outputHistory");
    this.helpModal = this.$("helpModal");
    this.keypad = this.$("mobileKeypad");
    this.mobileDisplay = this.$("mobileInputDisplay");
    this.commandPanel = this.$("commandPanel");
    this.copyButton = this.$("copyButton");
    this.visualizationModal = this.$("visualizationModal");
    this.visualizationContainer = this.$("visualizationContainer");
    this.stepSizeInput = this.$("stepSizeInput");
    this.saveButton = this.$("saveComputationBtn");
  }
  listen() {
    this.input.addEventListener("keydown", (event) => this.handleKeyDown(event));
    this.copyButton.addEventListener("click", () => this.copySession());
    this.$("helpButton").addEventListener("click", () => this.showHelp());
    this.$("clearButton").addEventListener("click", () => this.run("clear()"));
    this.$("closeHelp").addEventListener("click", () => this.hideModal(this.helpModal));
    this.$("closeVisualization").addEventListener("click", () => this.hideVisualization());
    this.$("exportSVGBtn").addEventListener("click", () => this.download("interval.svg", "image/svg+xml", this.visualization?.exportSVG()));
    this.$("exportHTMLBtn").addEventListener("click", () => this.download("interval.html", "text/html", this.visualization?.exportHTML?.()));
    this.saveButton.addEventListener("click", () => this.saveVisualization());
    this.stepSizeInput.addEventListener("input", () => this.updateStepSize());
    for (const modal of [this.helpModal, this.visualizationModal]) {
      modal.addEventListener("click", (event) => {
        if (event.target === modal)
          this.hideModal(modal);
      });
    }
    this.root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.hideModal(this.helpModal);
        this.hideVisualization();
      }
    });
    this.setupKeypad();
    if (!this.isMobile())
      setTimeout(() => this.input.focus(), 100);
  }
  isMobile() {
    return typeof window !== "undefined" && window.innerWidth <= 768;
  }
  handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.navigateHistory(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      this.navigateHistory(1);
    }
  }
  navigateHistory(direction) {
    if (this.history.length === 0)
      return;
    if (direction < 0)
      this.historyIndex = this.historyIndex === -1 ? this.history.length - 1 : Math.max(0, this.historyIndex - 1);
    else if (this.historyIndex === -1)
      return;
    else if (this.historyIndex < this.history.length - 1)
      this.historyIndex += 1;
    else {
      this.historyIndex = -1;
      this.setInput("");
      return;
    }
    this.setInput(this.history[this.historyIndex]);
  }
  currentInput() {
    return this.isMobile() ? this.mobileInput : this.input.value;
  }
  setInput(text) {
    if (this.isMobile()) {
      this.mobileInput = text;
      this.updateMobileDisplay();
    } else {
      this.input.value = text;
      this.input.focus();
      this.input.setSelectionRange(text.length, text.length);
    }
  }
  submit() {
    const source = this.currentInput().trim();
    if (!source)
      return;
    this.setInput("");
    this.run(source);
  }
  run(source) {
    this.history.push(source);
    this.historyIndex = -1;
    const command = source.trim().toLowerCase();
    const result = command === "help" || command === ".help" ? { ok: true, text: HELP_TEXT, value: undefined } : this.session.evaluate(source);
    this.addEntry(source, result);
    return result;
  }
  addEntry(source, result) {
    if (source === "clear()" && result.ok)
      return;
    const entry = document.createElement("div");
    entry.className = "output-entry";
    const inputLine = document.createElement("div");
    inputLine.className = "input-line";
    inputLine.innerHTML = '<span class="prompt">></span><span class="input-text"></span><span class="reload-icon" title="Reload expression">↻</span>';
    inputLine.querySelector(".input-text").textContent = source;
    inputLine.addEventListener("click", () => this.setInput(source));
    entry.appendChild(inputLine);
    const outputLine = document.createElement("div");
    outputLine.className = result.ok ? "output-line" : "error-line";
    outputLine.textContent = result.text;
    if (result.ok && result.value !== undefined) {
      const inject = document.createElement("span");
      inject.className = "inject-icon";
      inject.title = "Use the value (ans)";
      inject.textContent = "→";
      outputLine.appendChild(inject);
      outputLine.addEventListener("click", (event) => {
        if (event.target.classList.contains("viz-icon"))
          return;
        this.insertAtCursor(this.injection(result.value));
      });
      if (result.value instanceof RationalInterval) {
        const viz = document.createElement("span");
        viz.className = "viz-icon";
        viz.title = "Visualize interval";
        viz.textContent = "\uD83D\uDCCA";
        viz.addEventListener("click", (event) => {
          event.stopPropagation();
          this.showVisualization(result.value, source);
        });
        outputLine.appendChild(viz);
      }
    }
    entry.appendChild(outputLine);
    this.output.appendChild(entry);
    this.transcript.push(`> ${source}
${result.text}`);
    requestAnimationFrame(() => {
      this.output.scrollTop = this.output.scrollHeight;
    });
  }
  injection(value) {
    if (value instanceof RationalInterval)
      return `R\`${value.low}:${value.high}\``;
    if (value?.constructor?.name === "Rational" || value?.constructor?.name === "Integer")
      return `R\`${value}\``;
    return "ans";
  }
  insertAtCursor(text) {
    if (this.isMobile()) {
      this.mobileInput += text;
      this.updateMobileDisplay();
      return;
    }
    const { selectionStart: start, selectionEnd: end, value } = this.input;
    this.input.value = value.slice(0, start) + text + value.slice(end);
    this.input.selectionStart = this.input.selectionEnd = start + text.length;
    this.input.focus();
  }
  backspace() {
    if (this.isMobile()) {
      this.mobileInput = this.mobileInput.slice(0, -1);
      this.updateMobileDisplay();
      return;
    }
    const { selectionStart: start, selectionEnd: end, value } = this.input;
    const from = start === end ? Math.max(0, start - 1) : start;
    this.input.value = value.slice(0, from) + value.slice(end);
    this.input.selectionStart = this.input.selectionEnd = from;
    this.input.focus();
  }
  setupKeypad() {
    for (const button of this.root.querySelectorAll(".keypad-btn[data-key]")) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this.insertAtCursor(button.dataset.key);
      });
    }
    const actions = {
      backspace: () => this.backspace(),
      clear: () => this.setInput(""),
      enter: () => this.submit(),
      help: () => this.showHelp(),
      command: () => this.commandPanel.classList.add("show")
    };
    for (const button of this.root.querySelectorAll(".keypad-btn[data-action]")) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        actions[button.dataset.action]?.();
      });
    }
    this.$("closeCommandPanel").addEventListener("click", () => this.commandPanel.classList.remove("show"));
    for (const button of this.root.querySelectorAll(".command-btn")) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this.commandPanel.classList.remove("show");
        this.run(button.dataset.command);
      });
    }
    if (this.isMobile()) {
      for (const [name, value] of [["inputmode", "none"], ["autocomplete", "off"], ["autocorrect", "off"], ["autocapitalize", "off"]]) {
        this.input.setAttribute(name, value);
      }
      this.keypad.classList.add("show");
      document.body.classList.add("keypad-visible");
      this.updateMobileDisplay();
    }
  }
  updateMobileDisplay() {
    if (!this.mobileDisplay)
      return;
    this.mobileDisplay.innerHTML = '<span class="mobile-prompt">></span> <span class="mobile-text"></span>';
    this.mobileDisplay.querySelector(".mobile-text").textContent = this.mobileInput;
    this.mobileDisplay.style.display = document.body.classList.contains("keypad-visible") ? "flex" : "none";
    this.output.scrollTop = this.output.scrollHeight;
  }
  displayWelcome() {
    const welcome = document.createElement("div");
    welcome.className = "output-entry welcome";
    welcome.innerHTML = `
      <div class="output-line no-mobile" style="color: #059669; font-weight: 600;">Welcome to RatCalc — JavaScript with exact rational arithmetic.</div>
      <div class="output-line no-mobile">Try <code>R\`1:2 + 3\`</code>, <code>let x = R\`1/3\`</code>, or <code>[1, 2, 3].map(n =&gt; R\`1/\${n}\`)</code>.</div>
      <div class="output-line no-mobile">Type <code>help()</code> or use the Help button.</div>`;
    this.output.appendChild(welcome);
  }
  clearOutput() {
    this.output.innerHTML = "";
    this.transcript = [];
    this.displayWelcome();
  }
  showHelp() {
    this.helpModal.style.display = "block";
  }
  hideModal(modal) {
    if (modal === this.visualizationModal)
      return this.hideVisualization();
    modal.style.display = "none";
    if (!this.isMobile())
      setTimeout(() => this.input.focus(), 50);
  }
  async copySession() {
    const text = this.transcript.join(`
`);
    const label = this.copyButton.textContent;
    try {
      if (!text)
        throw new Error("empty");
      await navigator.clipboard.writeText(text);
      this.copyButton.textContent = "Copied";
    } catch {
      this.copyButton.textContent = text ? "Copy failed" : "Nothing to copy";
    }
    setTimeout(() => {
      this.copyButton.textContent = label;
    }, 1500);
  }
  showVisualization(interval, label) {
    this.visualizationContainer.innerHTML = "";
    this.visualization?.destroy?.();
    this.visualization = new IntervalVisualization(this.visualizationContainer, {
      width: this.visualizationContainer.clientWidth || Math.min(window.innerWidth - 100, 800),
      height: 200
    });
    this.visualization.addInterval(interval, { label: label.length <= 24 ? label : "Interval", color: "#2563eb", draggable: true });
    this.updateStepSize();
    this.visualizationModal.style.display = "block";
  }
  hideVisualization() {
    this.visualizationModal.style.display = "none";
    this.visualization?.destroy?.();
    this.visualization = null;
  }
  updateStepSize() {
    const n = Math.max(1, Number.parseInt(this.stepSizeInput.value, 10) || 10);
    this.visualization?.setDragStepSize?.(this.session.evaluate(`R\`1/${n}\``).value);
  }
  saveVisualization() {
    const interval = this.visualization?.intervals?.[0]?.interval;
    if (!interval)
      return;
    this.insertAtCursor(this.injection(interval));
    this.hideVisualization();
  }
  download(name, type, data) {
    if (!data)
      return;
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }
}
if (typeof document !== "undefined" && typeof document.getElementById === "function" && document.getElementById("calculatorInput")) {
  globalThis.ratcalc = new WebCalculator(document);
}
export {
  WebCalculator
};
