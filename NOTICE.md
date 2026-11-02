# Source and contribution notices

The four standalone packages have independent manifests, runtime entrypoints and notices. The optional suite includes generated copies of those runtime files; use npm run sync after changing the canonical packages.

## Notion adaptation

packages/dsh-notion-research continues this project's Notion adaptation. Its workflow concepts derive from notion-research-documentation in the OpenAI Plugins repository:
https://github.com/openai/plugins/tree/main/plugins/notion/skills/notion-research-documentation

The upstream skill carries Copyright 2025 Notion Labs, Inc. and an MIT permission notice, preserved in that package's THIRD_PARTY_LICENSES directory and in the optional suite. Source branch reviewed: main; no immutable upstream commit was recorded. Do not claim correspondence with a specific upstream release.

## Other implementations

The ownership analyzer, regression receipt runner, CI collector, related workflow instructions and packaging tools were written for this project. They do not bundle the implementations of the previously discussed third-party ownership/Sentry/GitHub skills projects.

The DSH development dependencies retain their own licenses and are not copied into release tarballs. This is an independent community project without endorsement by DeepSeek, OpenAI, Notion, Sentry or GitHub.

Your own additions and maintainer identity can be identified separately; third-party copyright and permission notices remain with reused material.
