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
