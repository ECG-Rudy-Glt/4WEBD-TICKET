FROM haproxy:2.8-alpine

USER root
RUN apk add --no-cache netcat-openbsd

ARG CFG_FILE=haproxy-account.cfg
COPY ${CFG_FILE} /usr/local/etc/haproxy/haproxy.cfg
