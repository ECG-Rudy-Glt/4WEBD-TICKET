FROM postgres:16-alpine
COPY start-replica.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/start-replica.sh
CMD ["start-replica.sh"]