## Anvil Identify Extension

This extension is a core component of anvil and is required to function as expected.

## Installation

anvil will install this extension during post-install.

## Configuration

By default, the configuration block for this extension would look like:

```javascript
{
	"anvil.identify": {
		"continuous": false,
		"watchPaths": [
		],
		"specs": [ "**/*.js" ],
		"ignore": [
			"**/*.sw?",
			"**/.*~",
			"**/#.*#",
			"**/.DS_Store"
		]
	}
}
```

### Continuous
This variable gets set from the --ci command line argument but can also be configured directly by setting this property to true in a configuration block in the build.json file.

### WatchPaths
This array is populated programatically but can also be manipulated so that anvil will re-trigger builds when a file within any path of the array is changed.

### Specs
This array is used to provide an exclusive regular expression filter for which files should be included in the anvil.project.specs list. This list is used by other anvil test runner extensions (anvil.mocha) so that the extension knows which files specifications are contained in.

### Ignore List
This array is used to filter out files matching any glob pattern from the anvil.project.files or anvil.project.specs collections which are used by other extensions to identify files that are part of the build.