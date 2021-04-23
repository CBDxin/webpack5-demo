# webpack5新特新demo

# 变更
## 1. 持久化缓存
在webpack<=4中，我们可以通过`cache-loader`、设置`babel-loader` `option.cacheDirectory`、使用 `hard-source-webpack-plugin`等手段来将编译的结果写入到磁盘中。而在webpack5中，webpack默认会把编译的结果缓存到内存中，同时可以通过添加以下配置，将编译结果缓存到文件系统中：
```
module.exports = {
    ...,
    cache: {
        type: 'filesystem',//将缓存类型设置为文件系统，默认为memory
        buildDependencies: {
            config: [__filename],  // 当构建依赖的config文件（通过 require 依赖）内容发生变化时，缓存失效
        },
        ...,
    },
}
```
`filesystem`模式首次打包效果：
![image.png](https://upload-images.jianshu.io/upload_images/13434832-ddae8c3cdc70390c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

filesystem模式二次打包效果：
![image.png](https://upload-images.jianshu.io/upload_images/13434832-ec7060c6118626ea.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)


缓存将默认存储在 `node_modules/.cache/webpack`（当使用 node_modules 时）或 .yarn/.cache/webpack（当使用 Yarn PnP 时）中。

ps:
* 直接通过调用compiler 实例的 run 方法执行构建时，构建缓存最终可能不会生成缓存文件，需要手动调用 `compiler.close()` 来输出缓存文件。
* [webpack5的持久化缓存和cnpm的安装包名之间有冲突，导致webpack5假死, 无法生成缓存文件](https://github.com/cnpm/cnpm/issues/335)

## 2. 对资源模块提供了内置支持
webpack5允许应用使用资源文件（图片，字体等)而不需要配置额外的loader。
* `asset/resource` 发送一个单独的文件并导出 URL。之前通过使用 file-loader 实现。
* `asset/inline` 导出一个资源的 data URI。之前通过使用 url-loader 实现。
* `asset/source` 导出资源的源代码。之前通过使用 raw-loader 实现。
* `asset` 在导出一个 data URI 和发送一个单独的文件之间自动选择。之前通过使用 url-loader，并且配置资源体积限制实现。
```
module.export = {
  ...,
  module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset/resource", //对应file-loader
			},
			{
				test: /\.svg$/,
				type: "asset/inline", //对应url-loader 大小<limt 转化为base64
			},
			{
				test: /\.txt$/,
				type: "asset/source", //对应raw-loader
			},
			{
				test: /\.gif$/,
				type: "asset", //自动选择
				parser: {
					dataUrlCondition: {
						maxSize: 4 * 1024,
					},
				},
			},
		],
	},
}
```
## 3. 内置 WebAssembly 编译能力
Webpack5 提供了 WebAssembly 构建能力，我们只需添加如下配置：
```
module.exports = {
    ...,
	experiments: {
		asyncWebAssembly: true,
	},
	module: {
		rules: [
			{
				test: /\.wasm$/,
				type: "webassembly/async",
			},
		],
	},
}
```
便可以在应用中使用wasm文件，举个例子，我们有个提供加法运算的wasm文件sum.wasm,我们可以这样在项目中使用它：
```
import { sum } from "./sum.wasm";
console.log(sum(1, 2));
```
## 3. 原生Web Worker 支持
以前若我们想要使用`web worker`，那么我们需要` worker-loader `或 `worker-plugin` 来协助我们：
```
//配置worker-loader
module.exports = {
    ...,
	module: {
		rules: [
			{
				test: /\.worker\.js$/,
				use: { loader: "worker-loader" },
			},
		],
	},
}
```
```
import Worker from './wasted.time.worker.js';
//在主线程中使用web worker
const worker = new Worker();
worker.onmessage = e => {
  console.log(e.data.value);
};
```
webpack5提供了原生的web worker支持，我们可以不依赖loader或plugin，直接使用web worker的能力：
```
const worker = new Worker(new URL("./wasted.time.worker.js", import.meta.url), {
	name: "wastedTime",
	/* webpackEntryOptions: { filename: "workers/[name].js" } */
});
worker.onmessage = e => {
	console.log(e.data.value);
};
```

## 5. 更友好的 Long Term Cache 支持性
长效缓存特性减少了由于模块变更导致的文件 hash 值的改变而导致文件缓存失效的情况，使得应用可以充分利用浏览器缓存。
#### 5.1 确定的moduleId 和 chunkId
webpack5之前的版本的 moduleId 和 chunkId 默认是自增的，没有从entry打包的chunk都会以1、2、3、4...的递增形式的文件命名方式进行命名。在我们对chunk进行增删操作时，很容易就导致浏览器缓存的失效。

![image.png](https://upload-images.jianshu.io/upload_images/13434832-99d8ef6366b57cc1.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)
![image.png](https://upload-images.jianshu.io/upload_images/13434832-45427df15157a90e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

![image.png](https://upload-images.jianshu.io/upload_images/13434832-be20f323411d5fb5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)
![image.png](https://upload-images.jianshu.io/upload_images/13434832-a2f33f8edf90f001.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

webpack5为了确保moduleId，chunkId 的确定性， 增加了如下配置（此配置在生产模式下是默认开启）：
```
optimization.moduleIds = 'deterministic'
optimization.chunkIds = 'deterministic'
```
添加上面的配置后，webpack会通过确定的 hash 生成算法为 module 和 chunk 分配 3-5 位数字 id。这样的话，即使我们对chunk有增删的操作，但是由于 moduleId 和 chunkId 确定了，浏览器缓存便不会失效。

在开发模式下，可以使用以下配置来生成更友好的id:
```
optimization.moduleIds = 'named'
optimization.chunkIds = 'named'
```

#### 5.2 真实的content hash
当使用 [contenthash] 时，Webpack 5 将使用真正的文件内容哈希值。也就是说当进行了修改注释或者修改变量名等代码逻辑是没有影响的操作是，文件内容的变更不会导致 contenthash 变化。
![image.png](https://upload-images.jianshu.io/upload_images/13434832-ab8fbf05127c695c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)
![image.png](https://upload-images.jianshu.io/upload_images/13434832-2fbd309348e8bc61.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)
![image.png](https://upload-images.jianshu.io/upload_images/13434832-43b91399064a99f5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)


## 6. 优化资源打包策略
[prepack](https://prepack.io/) 能够在编译的时候，将一些无副作用的函数的结果提前计算出来：
![image.png](https://upload-images.jianshu.io/upload_images/13434832-33cbacb608f53faf.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)
webpack5内置了这种能力，能够让你的应用在生产环境下得到极致的优化：
```
//入口文件
(function () {
	function hello() {
		return "hello";
	}
	function world() {
		return "world";
	}
	global.s = hello() + " " + world();
})();

```
打包结果：
![image.png](https://upload-images.jianshu.io/upload_images/13434832-c0690186a4da7fec.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

## 7. 更强大的tree shaking
tree-shaking能够帮助我们在打包的时候剔除无用的代码。webpack5开启tree-shaking的条件与之前一样，需要使用ES6模块化，并开启production环境。
```
//1.js
export const useful = "useful";
export const useless = "useless";


//2.js
import * as one from "./1.js";
export { one };

//index.js
import * as two from "./2.js";
console.log(two.one.useful);
```
webpack4的打包结果还是会把useless变量打包进来：
![image.png](https://upload-images.jianshu.io/upload_images/13434832-a6c9dec0dac17c8a.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)


webpack5分析模块的 export 和 import 的依赖关系，去掉未被使用的模块，同时结合prepack能力，打包出来的结果十分简洁：
![image.png](https://upload-images.jianshu.io/upload_images/13434832-5034ea491bbd51f1.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)


## 8. Top Level Await
Webpack5 支持 Top Level Await。简单来说就是可以在顶层的 async 函数外部使用 await 字段。
举个例子，我们有这么个异步函数a：
```
function a() {
	return new Promise(function (resolve, reject) {
		setTimeout(() => {
			resolve("done");
		}, 2000);
	});
}
```

在之前如果我们想在最顶层使用await的方式调用它，我们需要在调用它的外层包裹一个async匿名函数：
```
(async () => {
  const res = await a();
  console.log(res);
})()
```
而在webpack5中通过添加以下配置后：
```
module.exports = {
	experiments: {
		topLevelAwait: true,
	},
};
```
我们就能拜托外层匿名函数的限制，直接调用即可：
```
const res = await a();
console.log(res);
```

ps:该特性只能在ESM中使用。

## 9. 移除了 Node.js Polyfills
webpack <= 4 的版本中提供了许多 Node.js 核心模块的 polyfills，一旦某个模块引用了任何一个核心模块（如 cypto 模块），webpack 就会自动引用这些 polyfills。这会导致应用体积增大，尽管这些polyfills大多是用不上的。
正常打包的bundle大小：
![image.png](https://upload-images.jianshu.io/upload_images/13434832-17f3547260d2a863.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)
引入cypto后：
![image.png](https://upload-images.jianshu.io/upload_images/13434832-9a934c8a6508037e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

 webpack 5 开始不再自动填充这些 polyfills，如果你在webpack5中使用到了polyfill：
![image.png](https://upload-images.jianshu.io/upload_images/13434832-f2733b6964aabca5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)
你的应用将会报错，如果你确实是要是要这些模块，控制台中也给你提供了解决的方案，按照控制台的提示去安装对应的包和添加对应的配置就可以了。

# 新特性：
## Module Federation 模块联邦

change logs：https://webpack.docschina.org/blog/2020-10-10-webpack-5-release/#so-what-does-the-release-mean
迁移指南：https://webpack.docschina.org/migrate/5/