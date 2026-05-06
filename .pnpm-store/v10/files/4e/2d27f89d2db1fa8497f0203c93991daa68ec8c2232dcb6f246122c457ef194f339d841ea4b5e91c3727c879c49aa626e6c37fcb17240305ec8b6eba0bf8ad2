"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbTestUtilFactory = void 0;
exports.getDatabaseURL = getDatabaseURL;
exports.getMikroOrmConfig = getMikroOrmConfig;
exports.getMikroOrmWrapper = getMikroOrmWrapper;
const logger_1 = require("@medusajs/framework/logger");
const utils_1 = require("@medusajs/framework/utils");
const postgresql_1 = require("@medusajs/framework/mikro-orm/postgresql");
const pg_god_1 = require("pg-god");
const medusa_test_runner_utils_1 = require("./medusa-test-runner-utils");
const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_USERNAME = process.env.DB_USERNAME ?? "";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_PORT = process.env.DB_PORT ?? "5432";
const pgGodCredentials = {
    user: DB_USERNAME,
    password: DB_PASSWORD,
    host: DB_HOST,
    port: parseInt(DB_PORT),
};
function getDatabaseURL(dbName) {
    const DB_HOST = process.env.DB_HOST ?? "localhost";
    const DB_USERNAME = process.env.DB_USERNAME ?? "postgres";
    const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
    const DB_PORT = process.env.DB_PORT ?? "5432";
    const DB_NAME = dbName ?? process.env.DB_TEMP_NAME;
    return `postgres://${DB_USERNAME}${DB_PASSWORD ? `:${DB_PASSWORD}` : ""}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}
function getMikroOrmConfig({ mikroOrmEntities, pathToMigrations, clientUrl, schema, }) {
    const DB_URL = clientUrl ?? getDatabaseURL();
    return (0, postgresql_1.defineConfig)({
        clientUrl: DB_URL,
        entities: Object.values(mikroOrmEntities),
        schema: schema ?? process.env.MEDUSA_DB_SCHEMA,
        debug: false,
        pool: {
            min: 2,
        },
        migrations: {
            pathTs: pathToMigrations,
            silent: true,
        },
        extensions: [utils_1.CustomDBMigrator],
    });
}
function getMikroOrmWrapper({ mikroOrmEntities, pathToMigrations, clientUrl, schema, }) {
    return {
        mikroOrmEntities,
        pathToMigrations,
        clientUrl: clientUrl ?? getDatabaseURL(),
        schema: schema ?? process.env.MEDUSA_DB_SCHEMA,
        orm: null,
        manager: null,
        getManager() {
            if (this.manager === null) {
                throw new Error("manager entity not available");
            }
            return this.manager;
        },
        forkManager() {
            if (this.manager === null) {
                throw new Error("manager entity not available");
            }
            return this.manager.fork();
        },
        getOrm() {
            if (this.orm === null) {
                throw new Error("orm entity not available");
            }
            return this.orm;
        },
        async setupDatabase() {
            const OrmConfig = getMikroOrmConfig({
                mikroOrmEntities: this.mikroOrmEntities,
                pathToMigrations: this.pathToMigrations,
                clientUrl: this.clientUrl,
                schema: this.schema,
            });
            try {
                this.orm = await postgresql_1.MikroORM.init(OrmConfig);
                this.manager = this.orm.em;
                try {
                    await this.orm.getSchemaGenerator().ensureDatabase();
                }
                catch (err) {
                    logger_1.logger.error("Error ensuring database:", err);
                    throw err;
                }
                await this.manager?.execute(`CREATE SCHEMA IF NOT EXISTS "${this.schema ?? "public"}";`);
                const pendingMigrations = await this.orm
                    .getMigrator()
                    .getPendingMigrations();
                if (pendingMigrations && pendingMigrations.length > 0) {
                    await this.orm
                        .getMigrator()
                        .up({ migrations: pendingMigrations.map((m) => m.name) });
                }
                else {
                    await this.orm.schema.refreshDatabase();
                }
            }
            catch (error) {
                if (this.orm) {
                    try {
                        await this.orm.close();
                    }
                    catch (closeError) {
                        logger_1.logger.error("Error closing ORM:", closeError);
                    }
                }
                this.orm = null;
                this.manager = null;
                throw error;
            }
        },
        async clearDatabase() {
            if (this.orm === null) {
                throw new Error("ORM not configured");
            }
            try {
                await this.manager?.execute(`DROP SCHEMA IF EXISTS "${this.schema ?? "public"}" CASCADE;`);
                await this.manager?.execute(`CREATE SCHEMA IF NOT EXISTS "${this.schema ?? "public"}";`);
                const closePromise = this.orm.close();
                await (0, medusa_test_runner_utils_1.execOrTimeout)(closePromise);
            }
            catch (error) {
                logger_1.logger.error("Error clearing database:", error);
                try {
                    await this.orm?.close();
                }
                catch (closeError) {
                    logger_1.logger.error("Error during forced ORM close:", closeError);
                }
                throw error;
            }
            finally {
                this.orm = null;
                this.manager = null;
            }
        },
    };
}
const dbTestUtilFactory = () => ({
    pgConnection_: null,
    create: async function (dbName) {
        try {
            await (0, pg_god_1.createDatabase)({ databaseName: dbName, errorIfExist: false }, pgGodCredentials);
        }
        catch (error) {
            logger_1.logger.error("Error creating database:", error);
            throw error;
        }
    },
    teardown: async function ({ schema } = {}) {
        if (!this.pgConnection_) {
            return;
        }
        try {
            const runRawQuery = this.pgConnection_.raw.bind(this.pgConnection_);
            schema ??= "public";
            const { rows: tableNames } = await runRawQuery(`SELECT table_name
                                              FROM information_schema.tables
                                              WHERE table_schema = '${schema}';`);
            const skipIndexPartitionPrefix = "cat_";
            const mainPartitionTables = ["index_data", "index_relation"];
            let hasIndexTables = false;
            const tablesToTruncate = [];
            const allTablesToVerify = [];
            for (const { table_name } of tableNames) {
                if (mainPartitionTables.includes(table_name)) {
                    hasIndexTables = true;
                }
                if (table_name.startsWith(skipIndexPartitionPrefix) ||
                    mainPartitionTables.includes(table_name)) {
                    allTablesToVerify.push(table_name);
                    continue;
                }
                tablesToTruncate.push(`${schema}."${table_name}"`);
                allTablesToVerify.push(table_name);
            }
            const allTablesToTruncase = [
                ...tablesToTruncate,
                ...(hasIndexTables ? mainPartitionTables : []),
            ].join(", ");
            if (allTablesToTruncase) {
                await runRawQuery(`TRUNCATE ${allTablesToTruncase};`);
            }
            const verifyEmpty = async (maxRetries = 5) => {
                for (let retry = 0; retry < maxRetries; retry++) {
                    const countQueries = allTablesToVerify.map((tableName) => `SELECT '${tableName}' as table_name, COUNT(*) as count FROM ${schema}."${tableName}"`);
                    const { rows: counts } = await runRawQuery(countQueries.join(" UNION ALL "));
                    const nonEmptyTables = counts.filter((row) => parseInt(row.count) > 0);
                    if (nonEmptyTables.length === 0) {
                        return true;
                    }
                    if (retry < maxRetries - 1) {
                        await new Promise((resolve) => setTimeout(resolve, 100));
                    }
                    else {
                        const tableList = nonEmptyTables
                            .map((t) => `${t.table_name}(${t.count})`)
                            .join(", ");
                        logger_1.logger.warn(`Some tables still contain data after truncate: ${tableList}`);
                    }
                }
                return false;
            };
            await verifyEmpty();
        }
        catch (error) {
            logger_1.logger.error("Error during database teardown:", error);
            throw error;
        }
    },
    shutdown: async function (dbName) {
        try {
            const cleanupPromises = [];
            if (this.pgConnection_?.context) {
                cleanupPromises.push((0, medusa_test_runner_utils_1.execOrTimeout)(this.pgConnection_.context.destroy()));
            }
            if (this.pgConnection_) {
                cleanupPromises.push((0, medusa_test_runner_utils_1.execOrTimeout)(this.pgConnection_.destroy()));
            }
            await Promise.all(cleanupPromises);
            return await (0, pg_god_1.dropDatabase)({ databaseName: dbName, errorIfNonExist: false }, pgGodCredentials);
        }
        catch (error) {
            logger_1.logger.error("Error during database shutdown:", error);
            try {
                await this.pgConnection_?.context?.destroy();
                await this.pgConnection_?.destroy();
            }
            catch (cleanupError) {
                logger_1.logger.error("Error during forced cleanup:", cleanupError);
            }
            throw error;
        }
        finally {
            this.pgConnection_ = null;
        }
    },
});
exports.dbTestUtilFactory = dbTestUtilFactory;
//# sourceMappingURL=database.js.map