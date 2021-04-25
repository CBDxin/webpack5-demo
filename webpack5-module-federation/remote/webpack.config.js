const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const path = require("path");

module.exports = {
	entry: "./src/index",
	mode: "development",
	devtool: "inline-source-map",
	devServer: {
		contentBase: path.join(__dirname, "dist"),
		port: 9001,
	},
	output: {
		path: path.resolve(__dirname, "./dist"),
		filename: "[name].js",
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				loader: "babel-loader",
				exclude: /node_modules/,
				options: {
					presets: ["@babel/preset-react"],
				},
			},
		],
	},
	plugins: [
		new ModuleFederationPlugin({
			name: "remote",
			library: { type: "var", name: "remote" },
			filename: "remoteEntry.js",
			exposes: {
				"./Component": "./src/Component",
			},
			shared: ["react", "react-dom"],
		}),
		new HtmlWebpackPlugin({
			template: "./public/index.html",
		}),
		new CleanWebpackPlugin(),
	],
	optimization: {
		moduleIds: "named",
		chunkIds: "named",
	},
};
