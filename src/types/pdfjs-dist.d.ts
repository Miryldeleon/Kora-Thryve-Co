export {}

declare global {
  interface Uint8Array {
    toHex?: () => string
  }
}

declare module 'pdfjs-dist/build/pdf.mjs'
declare module 'pdfjs-dist/legacy/build/pdf.mjs'
