FROM postgres:15-bullseye

RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    gettext-base \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install patroni[etcd3] psycopg2-binary

COPY patroni.yml.template /etc/patroni/patroni.yml.template
COPY post_init.sh         /etc/patroni/post_init.sh
COPY entrypoint.sh        /entrypoint.sh

RUN sed -i 's/\r//' /entrypoint.sh /etc/patroni/post_init.sh && \
    chmod +x /entrypoint.sh /etc/patroni/post_init.sh

ENV PGDATA=/var/lib/postgresql/data

EXPOSE 5432 8008

ENTRYPOINT ["/entrypoint.sh"]
