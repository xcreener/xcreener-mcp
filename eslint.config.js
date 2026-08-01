import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "dist-mcpb/**"],
  },
  ...tseslint.configs.recommended,
);
