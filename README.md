# yrn

> Make [`yarn`](https://yarnpkg.com/en/docs/cli/) behave like [`npm`](https://docs.npmjs.com/cli/npm).

```
npm install -g yrn
```

`yrn` takes all `install` calls and forwards them to `yarn`. All other calls will be forwarded to `npm`. If not already there `yrn` will remove the `yarn.lock` file as well as the automatically added dependencies.

## Usage

```bash
yrn install --save-dev standard tape # uses `yarn` to install
yrn uninstall --save-dev tape # uses `npm` to uninstall
```

## API

All calls to `yarn` cause it to create a `yarn.lock` next to the `package.json`. We delete it automatically afterwards if it was not there before.

#### `yrn install`

Is equivalent to `npm install` but actually calls `yarn install`.

#### `yrn install [pkgName, ...]`

Is equivalent to `npm install [pkgName, ...]` but actually calls `yarn add [pkgName, ...]` and then removes any `package.json` entries that `yarn` made.

#### `yrn install --save [pkgName, ...]`, `yrn install --save-dev [pkgName, ...]`

Is equivalent to `npm install --save [pkgName, ...]` but actually calls `yarn add [--dev] [pkgName, ...]`.

#### `yrn [cmd] [args]`

Calls `npm [cmd] [args]`

## License

MIT
