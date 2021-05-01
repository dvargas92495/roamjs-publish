# RoamJS Publish

A GitHub Action for allowing other developers to publish extensions to RoamJS.

## Prerequistes

You will first need to create an account on [RoamJS](https://roamjs.com). On your user page, click the developer token. Click the generate new token button, then request the path you'd like to deploy to. The path must be one of two formats:
- To claim a RoamJS subpath to deploy multiple files to, it must end in a `/`. For example, enter `foo/` to claim `https://roamjs.com/foo/index.js` and `https://roamjs.com/foo/other.js`.
- To claim a single file at RoamJS' root, it must end in a `.js`. For example, enter `foo.js` to claim `https://roamjs.com/foo.js`.

## Inputs

### `token`

**Required** Your RoamJS Developer Token

### `source`

**Required** The directory to deploy files from

### `path`

**Optional** The RoamJS path to deploy files to. If you requested a subpath from RoamJS, specify this input without the trailing `/`. If you requested `.js` files to be added to the RoamJS root, do not specify this input.

## Usage

```yaml
uses: dvargas92495/roamjs-publish@0.1.9
with:
    token: ${{ secrets.ROAMJS_DEVELOPER_TOKEN }}
    source: dist
    path: foo
```
