## miskamyasa/platforma-backend
FROM node:12.14.1-stretch

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y --no-install-recommends apt-utils
RUN apt-get install -y --no-install-recommends gsfonts imagemagick ffmpeg && rm -rf /var/lib/apt/lists/*

