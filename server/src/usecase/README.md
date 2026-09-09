# usecase/

Business flows, one file per resource/feature. Plain functions that depend on domain
only and receive repositories (ports) as arguments — never import from `interface/`
or `infra/`.
