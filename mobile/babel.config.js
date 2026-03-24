module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel"
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src"
          },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
        }
      ],
      // THIS MUST BE THE ABSOLUTE LAST ITEM IN THE PLUGINS ARRAY
      "react-native-reanimated/plugin" 
    ]
  };
};