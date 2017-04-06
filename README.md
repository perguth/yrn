# yrn

> A package manager that behaves like [`npm`](https://docs.npmjs.com/cli/npm) but is [~2.4 times](https://github.com/pguth/yrn/issues/12) faster.

```bash
npm install -g yarn # yrn relies on `yarn` for actual pkg management
npm install -g yrn
```

**`yrn`** takes all `install` calls and forwards them to `yarn`. All other calls will be forwarded to `npm`.

> **In depth:**  It will remove the `yarn.lock` file as well as the added dependencies.It will restore the deleted files in`node_packages` and gets rid of `node_modules/.yarn-integrity`. Exception: previously existing `yarn` files will be kept.

## Usage

```bash
yrn install --save-dev standard tape # uses `yarn` to install
yrn uninstall --save-dev tape # uses `npm` to uninstall
```

## CLI

All calls to `yarn` cause it to create a `yarn.lock` and a `node_modules/.yarn-integrity`. We delete them automatically afterwards if they weren't there before.

#### `yrn install`

Is equivalent to `npm install` but actually calls `yarn install`. It will restore all packages that `yarn` deletes.

#### `yrn install [pkgName, ...]`

Is equivalent to `npm install [pkgName, ...]` but actually calls `yarn add [pkgName, ...]` and then removes any new `package.json` entries that `yarn` made.

#### `yrn install --save [pkgName, ...]`, `yrn install --save-dev [pkgName, ...]`

Is equivalent to `npm install --save [pkgName, ...]` but actually calls `yarn add [--dev] [pkgName, ...]`.

#### `yrn [cmd] [args]`

Calls `npm [cmd] [args]`.

## License

MIT
