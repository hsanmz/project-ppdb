import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Aset statis & berkas hasil generate -- bukan kode sumber aplikasi.
    // `public/draco/**` adalah decoder Draco milik three.js (vendor).
    "public/**",
    "compress-wisuda.js",
    "**/*.bak",
  ]),
  // `components/ui/orbit-delivery-hero.tsx` adalah bundel three.js hasil
  // decompile yang disimpan apa adanya ( ribuan baris `var`). Gaya kodenya
  // disengaja dan tidak layak dirapikan di sini, jadi aturan umum
  // dinonaktifkan untuk file ini saja -- bukan untuk seluruh proyek.
  {
    files: ["components/ui/orbit-delivery-hero.tsx"],
    rules: {
      "no-var": "off",
      "react/display-name": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/use-memo": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;
