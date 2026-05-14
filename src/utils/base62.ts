const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = BigInt(ALPHABET.length); // 62n

/**
 * using BigInt throughout because the IDs from Postgres come back as BigInt (Prisma maps Postgres BIGINT to JS * BigInt).
 */

/**
 * Encode a non-negative BigInt into a Base62 string.
 * Used to convert an auto-increment DB id into a compact short code.
 */
export function encodeBase62(num: bigint): string {
  if (num < 0n) {
    throw new Error("Cannot encode negative number");
  }
  if (num === 0n) {
    return ALPHABET[0];
  }

  let result = "";
  let n = num;
  while (n > 0n) {
    const remainder = n % BASE;
    result = ALPHABET[Number(remainder)] + result;
    n = n / BASE;
  }
  return result;
}

/**
 * Decode a Base62 string back into a BigInt.
 * Not strictly required for the redirect path (we store the encoded code directly in the DB), but useful for
 * debugging and tests.
 */
export function decodeBase62(str: string): bigint {
  let result = 0n;
  for (const char of str) {
    const value = ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid Base62 character: ${char}`);
    }
    result = result * BASE + BigInt(value);
  }
  return result;
}
