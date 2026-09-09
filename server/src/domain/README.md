# domain/

Pure business core: entities + validation factories, repository interfaces (ports),
and `DomainError`. One file per entity/concept. Imports nothing from other layers;
never logs, never touches env/DB/HTTP.
