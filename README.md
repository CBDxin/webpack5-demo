# webpack5 新特性 demo

# 目录结构

```
|-- webapck5-demo
    |-- package.json
    |-- README.md
    |-- webpack4
    |   |-- package.json
    |   |-- webpack.config.js
    |-- webpack5-asset
    |   |-- webpack.config.js
    |-- webpack5-filesystem-cache
    |   |-- webpack.config.js
    |-- webpack5-longterm-cache
    |   |-- webpack.config.js
    |-- webpack5-module-federation
    |   |-- host
    |   |   |-- package.json
    |   |   |-- webpack.config.js
    |   |-- remote
    |       |-- package.json
    |       |-- webpack.config.js
    |-- webpack5-polyfill
    |   |-- webpack.config.js
    |-- webpack5-prepack
    |   |-- webpack.config.js
    |-- webpack5-top-level-await
    |   |-- webpack.config.js
    |-- webpack5-tree-shaking
    |   |-- webpack.config.js
    |-- webpack5-wasm
    |   |-- webpack.config.js
    |-- webpack5-web-worker
        |-- webpack.config.js
```

可通过更改根目录下的 package.json 中的 build 和 start 命令来决定需要运行的 demo。webpack4 文件夹是单独的一个项目，用于做对比分析，webpack5-module-federation 下有 host 和 remote 两个独立的项目，用于演示模块联邦。

# 变更

## 持久化缓存

在 webpack<=4 中，我们可以通过`cache-loader`、设置`babel-loader` `option.cacheDirectory`、使用 `hard-source-webpack-plugin`等手段来将编译的结果写入到磁盘中。而在 webpack5 中，webpack 默认会把编译的结果缓存到内存中，同时可以通过添加以下配置，将编译结果缓存到文件系统中：

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

filesystem 模式二次打包效果：

![image.png](https://upload-images.jianshu.io/upload_images/13434832-ec7060c6118626ea.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

缓存将默认存储在 `node_modules/.cache/webpack`（当使用 node_modules 时）或 .yarn/.cache/webpack（当使用 Yarn PnP 时）中。

ps:

- 直接通过调用 compiler 实例的 run 方法执行构建时，构建缓存最终可能不会生成缓存文件，需要手动调用 `compiler.close()` 来输出缓存文件。
- [webpack5 的持久化缓存和 cnpm 的安装包名之间有冲突，导致 webpack5 假死, 无法生成缓存文件](https://github.com/cnpm/cnpm/issues/335)

## 对资源模块提供了内置支持

webpack5 允许应用使用资源文件（图片，字体等)而不需要配置额外的 loader。

- `asset/resource` 发送一个单独的文件并导出 URL。之前通过使用 file-loader 实现。
- `asset/inline` 导出一个资源的 data URI。之前通过使用 url-loader 实现。
- `asset/source` 导出资源的源代码。之前通过使用 raw-loader 实现。
- `asset` 在导出一个 data URI 和发送一个单独的文件之间自动选择。之前通过使用 url-loader，并且配置资源体积限制实现。

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

## 内置 WebAssembly 编译能力

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

便可以在应用中使用 wasm 文件，举个例子，我们有个提供加法运算的 wasm 文件 sum.wasm,我们可以这样在项目中使用它：

```
import { sum } from "./sum.wasm";
console.log(sum(1, 2));
```

## 原生 Web Worker 支持

以前若我们想要使用`web worker`，那么我们需要`worker-loader`或 `worker-plugin` 来协助我们：

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

webpack5 提供了原生的 web worker 支持，我们可以不依赖 loader 或 plugin，直接使用 web worker 的能力：

```
const worker = new Worker(new URL("./wasted.time.worker.js", import.meta.url), {
	name: "wastedTime",
	/* webpackEntryOptions: { filename: "workers/[name].js" } */
});
worker.onmessage = e => {
	console.log(e.data.value);
};
```

## 更友好的 Long Term Cache 支持性

长效缓存特性减少了由于模块变更导致的文件 hash 值的改变而导致文件缓存失效的情况，使得应用可以充分利用浏览器缓存。

#### 确定的 moduleId 和 chunkId

webpack5 之前的版本的 moduleId 和 chunkId 默认是自增的，没有从 entry 打包的 chunk 都会以 1、2、3、4...的递增形式的文件命名方式进行命名。在我们对 chunk 进行增删操作时，很容易就导致浏览器缓存的失效。

![image.png](https://upload-images.jianshu.io/upload_images/13434832-99d8ef6366b57cc1.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

![image.png](https://upload-images.jianshu.io/upload_images/13434832-45427df15157a90e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

![image.png](https://upload-images.jianshu.io/upload_images/13434832-be20f323411d5fb5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

![image.png](https://upload-images.jianshu.io/upload_images/13434832-a2f33f8edf90f001.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

webpack5 为了确保 moduleId，chunkId 的确定性， 增加了如下配置（此配置在生产模式下是默认开启）：

```
optimization.moduleIds = 'deterministic'
optimization.chunkIds = 'deterministic'
```

添加上面的配置后，webpack 会通过确定的 hash 生成算法为 module 和 chunk 分配 3-5 位数字 id。这样的话，即使我们对 chunk 有增删的操作，但是由于 moduleId 和 chunkId 确定了，浏览器缓存便不会失效。

在开发模式下，可以使用以下配置来生成更友好的 id:

```
optimization.moduleIds = 'named'
optimization.chunkIds = 'named'
```

#### 真实的 content hash

当使用 [contenthash] 时，Webpack 5 将使用真正的文件内容哈希值。也就是说当进行了修改注释或者修改变量名等代码逻辑是没有影响的操作是，文件内容的变更不会导致 contenthash 变化。
![image.png](https://upload-images.jianshu.io/upload_images/13434832-ab8fbf05127c695c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)
![image.png](https://upload-images.jianshu.io/upload_images/13434832-2fbd309348e8bc61.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)
![image.png](https://upload-images.jianshu.io/upload_images/13434832-43b91399064a99f5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

## 优化资源打包策略

[prepack](https://prepack.io/) 能够在编译的时候，将一些无副作用的函数的结果提前计算出来：
![image.png](https://upload-images.jianshu.io/upload_images/13434832-33cbacb608f53faf.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)
webpack5 内置了这种能力，能够让你的应用在生产环境下得到极致的优化：

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

## 更强大的 tree shaking

tree-shaking 能够帮助我们在打包的时候剔除无用的代码。webpack5 开启 tree-shaking 的条件与之前一样，需要使用 ES6 模块化，并开启 production 环境。

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

webpack4 的打包结果还是会把 useless 变量打包进来：

![image.png](https://upload-images.jianshu.io/upload_images/13434832-a6c9dec0dac17c8a.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

webpack5 分析模块的 export 和 import 的依赖关系，去掉未被使用的模块，同时结合 prepack 能力，打包出来的结果十分简洁：

![image.png](https://upload-images.jianshu.io/upload_images/13434832-5034ea491bbd51f1.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

## Top Level Await

Webpack5 支持 Top Level Await。简单来说就是可以在顶层的 async 函数外部使用 await 字段。
举个例子，我们有这么个异步函数 a：

```
function a() {
	return new Promise(function (resolve, reject) {
		setTimeout(() => {
			resolve("done");
		}, 2000);
	});
}
```

在之前如果我们想在最顶层使用 await 的方式调用它，我们需要在调用它的外层包裹一个 async 匿名函数：

```
(async () => {
  const res = await a();
  console.log(res);
})()
```

而在 webpack5 中通过添加以下配置后：

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

ps:该特性只能在 ESM 中使用。

## 移除了 Node.js Polyfills

webpack <= 4 的版本中提供了许多 Node.js 核心模块的 polyfills，一旦某个模块引用了任何一个核心模块（如 cypto 模块），webpack 就会自动引用这些 polyfills。这会导致应用体积增大，尽管这些 polyfills 大多是用不上的。
正常打包的 bundle 大小：

![image.png](https://upload-images.jianshu.io/upload_images/13434832-17f3547260d2a863.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

引入 cypto 后：

![image.png](https://upload-images.jianshu.io/upload_images/13434832-9a934c8a6508037e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

webpack 5 开始不再自动填充这些 polyfills，如果你在 webpack5 中使用到了 polyfill：

![image.png](https://upload-images.jianshu.io/upload_images/13434832-f2733b6964aabca5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

你的应用将会报错，如果你确实是要是要这些模块，控制台中也给你提供了解决的方案，按照控制台的提示去安装对应的包和添加对应的配置就可以了。

# 新特性：

## Module Federation 模块联邦

#### 模块联邦是什么

> ## [动机](https://webpack.docschina.org/concepts/module-federation/#motivation)
>
> 多个独立的构建可以组成一个应用程序，这些独立的构建之间不应该存在依赖关系，因此可以单独开发和部>署它们。
>
> 这通常被称作微前端，但并不仅限于此。

这是 webpack 官网中对该功能的动机的解释，简单来说就是允许一个应用中动态地去加载和引入另一个应用的代码。

#### 怎么使用模块联邦

我们现在有两个应用 `host` 和 `remote`，其中 `remote` 提供了一个组件 `Component` ，接下来我们将通过模块联邦让 `host` 能够使用 `Component` 。

> ps：`host` 和 `remote`只是为了让大家更换的理解，在当前例子中 ，`remote`负责提供被消费的代码，`host` 负责消费 `remote` 提供的代码。但实际使用中，一个应用既可以为其他应该提供消费的代码，同时也可以消费其他应用的代码

host 代码:

```
// /src/index.js
import("./bootstrap");

// /src/bootstrap.js
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
ReactDOM.render(<App />, document.getElementById("root"));

// /src/App.js
import React from "react";

const RemoteComponent = React.lazy(() => import("remote/Component"));

const App = () => (
	<div>
		<h2>Host</h2>
		<React.Suspense fallback="Loading Remote Component">
			<RemoteComponent />
		</React.Suspense>
	</div>
);

export default App;
```

host 配置：

```
...
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
	...,
	plugins: [
		new ModuleFederationPlugin({
			name: "host",
			remotes: {
				remote: "remote@http://localhost:9001/remoteEntry.js",
			},
			shared: ["react", "react-dom"],
		}),
		new HtmlWebpackPlugin({
			template: "./public/index.html",
		}),
		new CleanWebpackPlugin(),
	],
};
```

remote 代码：

```
// /src/index.js
import("./bootstrap");

// /src/bootstrap.js
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
ReactDOM.render(<App />, document.getElementById("root"));

// /src/App.js
import LocalComponent from "./Component";
import React from "react";

const App = () => (
	<div>
		<h2>Remote</h2>
		<LocalComponent />
	</div>
);

export default App;

// /src/Component.js
import React from "react";

const Component = () => <button>Remote Component</button>;

export default Component;
```

`host`中成功引入了`remote`的组件：

![image.png](https://upload-images.jianshu.io/upload_images/13434832-14b6436ec0a651d3.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

不知道大家看到代码有没有很好奇为什么需要通过`index.js` 去动态加载 `bootstrap.js`，如果我们把 bootstrap 这一层去掉会不会有啥问题呢？我们来把`host`的`entry`直接设置为`"./src/bootstrap"`试试看：
![image.png](https://upload-images.jianshu.io/upload_images/13434832-0b1d280c2f257d0e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)
这是为什么呢？我们先按下不表，接着往下看。

#### host 究竟是怎么去消费 remote 的

正确配置下的`host`的 js 文件加载顺序如下：
![image.png](https://upload-images.jianshu.io/upload_images/13434832-4a5f9f14165ce7ec.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/400)

我们先看看最早加载的 main.js 做了些什么:

```
(() => {
	// webpackBootstrap
	var __webpack_modules__ = {
		"./src/index.js": (__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {
			__webpack_require__
				.e(/*! import() */ "src_bootstrap_js")
				.then(
					__webpack_require__.bind(__webpack_require__, /*! ./bootstrap */ "./src/bootstrap.js")
				);
		},
		//external "remote@http://localhost:9001/remoteEntry.js"
		"webpack/container/reference/remote": (
			module,
			__unused_webpack_exports,
			__webpack_require__
		) => {
			"use strict";
			var __webpack_error__ = new Error();
			module.exports = new Promise((resolve, reject) => {
				if (typeof remote !== "undefined") return resolve();
				__webpack_require__.l(
					"http://localhost:9001/remoteEntry.js",
					event => {
						if (typeof remote !== "undefined") return resolve();
						var errorType = event && (event.type === "load" ? "missing" : event.type);
						var realSrc = event && event.target && event.target.src;
						__webpack_error__.message =
							"Loading script failed.\n(" + errorType + ": " + realSrc + ")";
						__webpack_error__.name = "ScriptExternalLoadError";
						__webpack_error__.type = errorType;
						__webpack_error__.request = realSrc;
						reject(__webpack_error__);
					},
					"remote"
				);
			}).then(() => remote);
		},
	}; // The module cache
	var __webpack_module_cache__ = {}; // The require function
	function __webpack_require__(moduleId) {...} // expose the modules object (__webpack_modules__)

	...//webpack runtime

	var __webpack_exports__ = __webpack_require__("./src/index.js");
})();
```

main.js 执行 `webpack_require("./src/index.js")`去加载`index.js`,`index.js`通过`webpack_require.e`动态加载`bootstrap.js`。咋一看好像和 webpack4 没啥区别，但其实`webpack_require.e`已经面目全非了。

```
	(() => {
		__webpack_require__.f = {}; // This file contains only the entry chunk. // The chunk loading function for additional chunks
		__webpack_require__.e = chunkId => {
			return Promise.all(
				Object.keys(__webpack_require__.f).reduce((promises, key) => {
					__webpack_require__.f[key](chunkId, promises);
					return promises;
				}, [])
			);
		};
	})(); /* webpack/runtime/get javascript chunk filename */
```

`webpack_require.e`会去遍历执行`webpack_require.f`上的所有属性，每个属性都是返回 promise 对象的函数，再通过`promise.all`使得当所有的属性的状态都为 resolve 时，`webpack_require.e`的状态才会 resolve。
那么，`webpack_require.f`都有哪些属性呢？

```
__webpack_require__.f.remotes = (chunkId, promises) => {}
__webpack_require__.f.consumes = (chunkId, promises) => {}
__webpack_require__.f.j = (chunkId, promises) => {}
```

- `consumes`:用于处理共享文件；
- `j`:原有的`webpack_require.e`函数；
- `remotes`:用于加载`remote`提供的组件；

我们重点来看看`__webpack_require__.f.remotes`:

```
(() => {
		var chunkMapping = {
			webpack_container_remote_remote_Component: ["webpack/container/remote/remote/Component"],
		};
		var idToExternalAndNameMapping = {
			"webpack/container/remote/remote/Component": [
				"default",
				"./Component",
				"webpack/container/reference/remote",
			],
		};
		__webpack_require__.f.remotes = (chunkId, promises) => {
			if (__webpack_require__.o(chunkMapping, chunkId)) {
				chunkMapping[chunkId].forEach(id => {
					var getScope = __webpack_require__.R;
					if (!getScope) getScope = [];
					var data = idToExternalAndNameMapping[id];
					...,
					var handleFunction = (fn, arg1, arg2, d, next, first) => {
						try {
							var promise = fn(arg1, arg2);
							if (promise && promise.then) {
								var p = promise.then(result => next(result, d), onError);
								if (first) promises.push((data.p = p));
								else return p;
							} else {
								return next(promise, d, first);
							}
						} catch (error) {
							onError(error);
						}
					};
					var onExternal = (external, _, first) =>
						external
							? handleFunction(__webpack_require__.I, data[0], 0, external, onInitialized, first)
							: onError();
					var onInitialized = (_, external, first) =>
						handleFunction(external.get, data[1], getScope, 0, onFactory, first);
					var onFactory = factory => {
						data.p = 1;
						__webpack_modules__[id] = module => {
							module.exports = factory();
						};
					};
					handleFunction(__webpack_require__, data[2], 0, 0, onExternal, 1);
				});
			}
		};
	})();
```

`__webpack_require__.f.remotes`主要做了四件事：

1. `__webpack_require__("webpack/container/reference/remote", 0);`
2. `__webpack_require__.I("default", getScope);`
3. `external.get("./Component", getScope);`
4. `onFactory(//external.get("./Component", getScop)的结果)`

第一步实际上是去加载了`remote`的`remoteEntry.js`,那么我们先来看看`remoteEntry.js`的内容：

```
var remote;
(() => {
	// webpackBootstrap
	var __webpack_modules__ = {
		//!*** container entry ***!
		"webpack/container/entry/remote": (__unused_webpack_module, exports, __webpack_require__) => {
			var moduleMap = {
				"./Component": () => {
					return Promise.all([
						__webpack_require__.e("webpack_sharing_consume_default_react_react-_024c"),
						__webpack_require__.e("src_Component_js"),
					]).then(() => () => __webpack_require__(/*! ./src/Component */ "./src/Component.js"));
				},
			};
			var get = (module, getScope) => {
				__webpack_require__.R = getScope;
				getScope = __webpack_require__.o(moduleMap, module)
					? moduleMap[module]()
					: Promise.resolve().then(() => {
							throw new Error('Module "' + module + '" does not exist in container.');
					  });
				__webpack_require__.R = undefined;
				return getScope;
			};
			var init = (shareScope, initScope) => {
				if (!__webpack_require__.S) return;
				var oldScope = __webpack_require__.S["default"];
				var name = "default";
				if (oldScope && oldScope !== shareScope)
					throw new Error(
						"Container initialization failed as it has already been initialized with a different share scope"
					);
				__webpack_require__.S[name] = shareScope;
				return __webpack_require__.I(name, initScope);
			};

			// This exports getters to disallow modifications
			__webpack_require__.d(exports, {
				get: () => get,
				init: () => init,
			});
		},
	};

	// The module cache
	var __webpack_module_cache__ = {};

	// The require function
	function __webpack_require__(moduleId) {...}
	//webpack runtime...

	var __webpack_exports__ = __webpack_require__("webpack/container/entry/remote");
	remote = __webpack_exports__;
})();
```

先来看看第一行和倒数第二行，`remoteEntry.js`声明了一个全局变量 remote，并把`__webpack_require__("webpack/container/entry/remote")`的赋予它，
那我们再来看看`"webpack/container/entry/remote"`，主要有三个部分组成:

- `moduleMap`：`remote`中的 exposes 配置对应的模块集合；
- `get`: `remote`中的组件的 getter，`host`可通过该函数获取远程组件；
- `init`：`host`可以通过该函数将 shared 依赖注入`remote`中;
  其实`init`和`get`操作将会在`__webpack_require__.f.remotes`的 2、3 步中调用，而第四步`onFactory(//external.get("./Component", getScop)的结果)`便会把`remote`中暴露的`./Component`组件引入到`host`中。

至于为什么需要通过`index.js` 去动态加载 `bootstrap.js`，这是因为我们配置了`shared`。`shared`中配置的共享依赖`react`、`react-dom`需要我们在`__webpack_require__.f.consumes`中进行处理，不然无法正常引入。如果我们把`shared`配置清空，应用是可以正常运行的，但这么做的话共享依赖的特性便无法生效。

change logs：https://webpack.docschina.org/blog/2020-10-10-webpack-5-release/#so-what-does-the-release-mean
迁移指南：https://webpack.docschina.org/migrate/5/
