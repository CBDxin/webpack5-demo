import { consoleA } from "./a.js";
import b from "./b.js";

consoleA();
console.log(b);

setTimeout(() => {
	import("./c.js").then(res => console.log(res.default));
}, 3000);
