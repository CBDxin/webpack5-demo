const path = require("path");

module.exports = {
	entry: path.resolve(__dirname, "./index.js"),
	mode: "production",
	output: {
		path: path.resolve(__dirname, "./dist"),
		filename: "main.js",
	},

	cache: {
		type: "filesystem", //将缓存类型设置为文件系统，默认为memory
		buildDependencies: {
			config: [__filename], // 当构建依赖的config文件（通过 require 依赖）内容发生变化时，缓存失效
		},
	},
};
