# Development notes

## Prerequisites

- [Node.js](https://nodejs.org/)
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (with Windows SDK)
- [Python](https://www.python.org/)

Note that Microsoft C++ Build Tools and Python can be installed manually or with `npm install --global --production windows-build-tools --vs2015` from your admin command prompt.

## Build

To build the package for the first time run `npm install`.


## Run

To compile components and recompile them when files change use `npm run watch`. Then, from a new command prompt use `npm start` to launch avatar-animator.


## Package

To create a folder named `pkg/avatar-animator-<os>` containing the main program and its dependencies use `npm run package`.
