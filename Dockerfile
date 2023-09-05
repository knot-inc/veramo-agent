FROM --platform=linux/amd64 node:18 as base

# Install pnpm globally https://github.com/pnpm/pnpm/issues/4837
RUN curl -L -o /usr/local/bin/pnpm https://github.com/pnpm/pnpm/releases/download/v8.6.12/pnpm-linux-x64
ENV PNPM_HOME=/usr/local/bin/
RUN chmod +x /usr/local/bin/pnpm

ARG TARGETPLATFORM
ARG BUILDPLATFORM
RUN echo "I am running on $BUILDPLATFORM, building for $TARGETPLATFORM"
WORKDIR /usr/src/app
COPY package.json .
COPY pnpm-lock.yaml .
RUN pnpm install --production

# BUILD APP 
ENV NODE_PATH=./build
COPY . .
RUN pnpm build

# on production, run from the second stage
FROM --platform=linux/amd64 node:18 as production
RUN echo "This is Production"
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=base /usr/src/app/build ./build
COPY --from=base /usr/src/app/package.json ./package.json
COPY --from=base /usr/src/app/ca/rds-ca-2019.pem ./ca/rds-ca-2019.pem
CMD ["npm", "start"]
EXPOSE 3332