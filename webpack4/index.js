import d from "./d.js";
import Worker from "./wasted.time.worker.js";
import cypto from "crypto";
import * as two from "./2.js";

console.log(two.one.useful);

console.log(crypto);

console.log(d);

import("./a.js").then(res => console.log(res));

import("./c.js").then(res => res.default());

setTimeout(() => {
	import("./b.js").then(res => console.log(res.default));
}, 3000);

const worker = new Worker();
worker.onmessage = e => {
	console.log(e.data.value);
};
