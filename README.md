# RoamJS Publish

A GitHub Action for allowing other developers to publish extensions to RoamJS.

## Prerequistes

You will first need to create an account on [RoamJS](https://roamjs.com). You will then need to subscribe to the [developer service](https://roamjs.com/services/developer). Copy the extension to your Roam DB and you will be taken to the `roam/js/developer` page upon installation. This will serve as your developer dashboard going forward.

To claim a RoamJS subpath, input a value and click `Request Path`. For example, enter `foo` to claim `https://roamjs.com/foo/*`. This will give you access to upload all content required by your extension to that path.

## Inputs

### `token`

**Required** Your RoamJS Developer Token

### `source`

**Required** The directory to deploy files from

### `path`

**Optional** The RoamJS path to deploy files to.

## Usage

```yaml
uses: dvargas92495/roamjs-publish@0.1.15
with:
    token: ${{ secrets.ROAMJS_DEVELOPER_TOKEN }}
    source: dist
    path: foo
```
