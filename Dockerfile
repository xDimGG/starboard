FROM golang:alpine

WORKDIR /go/src
COPY . github.com/xdimgg/starboard
WORKDIR /go/src/github.com/xdimgg/starboard

RUN apk update
RUN apk upgrade
RUN apk add git curl --no-cache
RUN curl https://raw.githubusercontent.com/golang/dep/master/install.sh | sh
RUN dep ensure
RUN go build -o /bin/starboard
RUN apk del golang* curl

ENTRYPOINT /bin/starboard