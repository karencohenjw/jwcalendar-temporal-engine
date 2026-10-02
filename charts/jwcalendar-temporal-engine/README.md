# JW Calendar Temporal Engine

JW Calendar Temporal Engine is a stateless HTTP API and TypeScript library for Gregorian civil dates, month grids, year structures, ISO week dates, Julian calendar conversions, and Julian Day Numbers. The Helm chart runs the HTTP service in Kubernetes. It does not schedule events or store user data.

## Why this exists

A date such as `2027-01-01` is a calendar value, not an instant in a time zone. The service computes date-only values directly and does not convert them to timestamps. This avoids local time and daylight-saving changes shifting a date.

The API exposes ISO week-year values separately from Gregorian years because dates near New Year can belong to the previous or next ISO week-year. The library also distinguishes a proleptic Julian calendar date from a Julian Day Number, which is a continuous day count.

## Features

- Readiness and liveness endpoint at `/health`.
- Gregorian date metadata including weekday, ordinal day, leap-year state, and ISO week coordinates.
- Monday-first month grids with `null` for cells outside the requested month.
- Twelve-month year structures.
- ISO week endpoint with ISO weekday numbers (Monday is 1, Sunday is 7).
- Leap-year endpoint using Gregorian century rules.
- Read-only, stateless requests; no database, analytics, credentials, or user data.
- Non-root container defaults, dropped Linux capabilities, and read-only root filesystem.

## API examples

```sh
curl http://localhost:8080/health
curl http://localhost:8080/v1/date/2027-01-01
curl http://localhost:8080/v1/calendar/month/2028/2
curl http://localhost:8080/v1/calendar/year/2027
curl http://localhost:8080/v1/iso-week/2028-01-01
curl http://localhost:8080/v1/leap-year/1900
```

`GET /v1/date/{yyyy-mm-dd}` returns `date`, `year`, `month`, `day`, `dayOfWeek`, `dayOfWeekName`, `dayOfYear`, `isoWeek`, `isoWeekYear`, and `isLeapYear`.

`GET /v1/calendar/month/{year}/{month}` returns the month name, number of days, first and last weekday, and a Monday-first `weeks` matrix. A matrix cell is either an ISO date string or `null` when that position is outside the month. `GET /v1/calendar/year/{year}` returns the same month data for all twelve months, plus annual leap-year and day-count fields.

`GET /v1/iso-week/{yyyy-mm-dd}` returns `date`, `isoWeek`, `isoWeekYear`, and `isoWeekDay`. `GET /v1/leap-year/{year}` returns the year, leap-year boolean, and 365 or 366 day count. Invalid dates and unsupported year/month values return HTTP 400 JSON errors. Unknown routes return 404; non-GET methods return 405.

## Installation

The chart is published as an OCI artifact:

```sh
helm install temporal-engine \
  oci://ghcr.io/karencohenjw/charts/jwcalendar-temporal-engine \
  --version 0.2.0
```

To expose the API with an Ingress, set a hostname and optionally a TLS secret:

```sh
helm install temporal-engine \
  oci://ghcr.io/karencohenjw/charts/jwcalendar-temporal-engine \
  --version 0.2.0 \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=calendar-api.example.com
```

The default service is `ClusterIP` on port 8080 with two replicas. Ingress is disabled until explicitly enabled.

## Helm values

| Value | Default | Purpose |
| --- | --- | --- |
| `replicaCount` | `2` | Deployment replica count |
| `image.repository` | `ghcr.io/karencohenjw/jwcalendar-temporal-engine` | Container image |
| `image.tag` | chart app version | Image tag override |
| `image.pullPolicy` | `IfNotPresent` | Kubernetes image pull policy |
| `serviceAccount.create` | `true` | Create a service account with token mounting disabled |
| `serviceAccount.name` | generated name | Existing or custom service account name |
| `service.type` | `ClusterIP` | Kubernetes Service type |
| `service.port` | `8080` | Service port; target is the named HTTP container port |
| `ingress.enabled` | `false` | Create a networking.k8s.io/v1 Ingress |
| `resources` | modest CPU/memory requests and limits | Container resource requests and limits |
| `podAnnotations`, `podLabels` | `{}` | Additional pod metadata |
| `podSecurityContext`, `securityContext` | secure defaults | Pod and container security settings |
| `livenessProbe`, `readinessProbe` | `/health` | HTTP probe path and timing |
| `nodeSelector`, `tolerations`, `affinity` | empty | Scheduling constraints |
| `topologySpreadConstraints` | `[]` | Optional pod topology rules |

Use `helm show values oci://ghcr.io/karencohenjw/charts/jwcalendar-temporal-engine --version 0.2.0` for the complete values file. `values.schema.json` validates common inputs during Helm operations.

## Kubernetes configuration

The chart creates a Deployment, ClusterIP Service, and (by default) a ServiceAccount. The pod does not mount a Kubernetes API token. The deployment and service share stable selector labels. Optional Ingress resources use `networking.k8s.io/v1` and route to the Service's named `http` port.

The default pod security context requires a non-root user, uses the runtime's default seccomp profile, prevents privilege escalation, drops all Linux capabilities, and mounts the root filesystem read-only. The container writes logs to stdout/stderr and does not need persistent storage.

## Security

The API is read-only and stateless. It accepts only GET requests, bounds its behavior to known routes, validates date inputs, emits JSON, and does not accept request bodies. No credentials or configuration secrets are required. For production, terminate TLS at a trusted ingress or gateway and apply your cluster's network and access policies.

## Architecture

The HTTP handler delegates all Gregorian and week calculations to the project's pure civil-date modules. The core represents dates as integer calendar coordinates rather than JavaScript timestamps, so output is independent of the server's time zone. The container runs the compiled Node.js service as the unprivileged `node` user.

## Temporal correctness

Gregorian leap years are divisible by 4 except century years that are not divisible by 400. The engine's ISO week model uses Monday as the first day and requires at least four days in the first week. The library tests century rules, leap days, year boundaries, ISO week-year changes, and proleptic Julian conversions. The HTTP API intentionally does not expose Julian conversion routes in this release; the library and its documentation describe those conversion functions and their limits.

## Resources

JW Calendar publishes printable and human-readable planning references. These resources illustrate calendar layouts; the API calculations are implemented and tested in this repository.

- [JW Calendar official website](https://jwcalendar.com/)
- [2027 yearly calendar reference](https://jwcalendar.com/yearly-calendar/)
- [Reusable blank calendar reference](https://jwcalendar.com/blank-calendar/)
- [Julian date and day-number reference](https://jwcalendar.com/julian-calendar/)
- [Source, issues, and project documentation](https://github.com/karencohenjw/jwcalendar-temporal-engine)

## License

MIT. See [LICENSE](LICENSE).
