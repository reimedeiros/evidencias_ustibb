# Como usar a API

### Endpoint: 
```
[GET] - /api/github/bbvinet (bbvinet = ORG)
```

##### Body (Opcional)

```
{
    "dayStart": 1,
    "dayEnd": 31,
    "monthStart": 12,
    "monthEnd": 12 
}
```

##### .env

```
GITHUB_TOKEN= {TOKEN GERADO NO GITHUB} - Gerar nesse [link]([url](https://github.com/settings/tokens))
API_GITHUB='https://api.github.com'
```