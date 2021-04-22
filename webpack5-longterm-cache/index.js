import d from "./d.js";

console.log(d);

import("./a.js").then(res => console.log(res));

import("./c.js").then(res => res.default());

setTimeout(() => {
	import("./b.js").then(res => console.log(res.default));
}, 3000);
