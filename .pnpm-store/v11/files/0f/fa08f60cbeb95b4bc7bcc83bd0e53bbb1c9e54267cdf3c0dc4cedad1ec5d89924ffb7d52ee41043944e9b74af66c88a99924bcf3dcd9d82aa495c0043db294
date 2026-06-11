"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moduleIntegrationTestRunner = moduleIntegrationTestRunner;
const logger_1 = require("@medusajs/framework/logger");
const utils_1 = require("@medusajs/framework/utils");
const fs = __importStar(require("fs"));
const database_1 = require("./database");
const init_modules_1 = require("./init-modules");
const mock_event_bus_service_1 = __importDefault(require("./mock-event-bus-service"));
const ulid_1 = require("ulid");
function createMikroOrmWrapper(options) {
    let moduleModels = options.moduleModels ?? [];
    if (!options.moduleModels) {
        const basePath = (0, utils_1.normalizeImportPathWithSource)(options.resolve ?? options.cwd ?? process.cwd());
        const modelsPath = fs.existsSync(`${basePath}/dist/models`)
            ? "/dist/models"
            : fs.existsSync(`${basePath}/models`)
                ? "/models"
                : "";
        if (modelsPath) {
            moduleModels = (0, utils_1.loadModels)(`${basePath}${modelsPath}`);
        }
        else {
            moduleModels = [];
        }
    }
    moduleModels = (0, utils_1.toMikroOrmEntities)(moduleModels);
    const MikroOrmWrapper = (0, database_1.getMikroOrmWrapper)({
        mikroOrmEntities: moduleModels,
        clientUrl: options.dbConfig.clientUrl,
        schema: options.dbConfig.schema,
    });
    return { MikroOrmWrapper, models: moduleModels };
}
class ModuleTestRunner {
    constructor(config) {
        this.hooks = {};
        this.connection = null;
        this.moduleModels = [];
        this.modulesConfig = {};
        this.shutdown = async () => void 0;
        this.moduleService = null;
        this.medusaApp = {};
        const tempName = parseInt(process.env.JEST_WORKER_ID || "1");
        this.moduleName = config.moduleName;
        const moduleName = this.moduleName ?? (0, ulid_1.ulid)();
        this.dbName =
            config.dbName ??
                `medusa-${moduleName.toLowerCase()}-integration-${tempName}`;
        this.schema = config.schema ?? "public";
        this.debug = config.debug ?? false;
        this.resolve = config.resolve;
        this.cwd = config.cwd;
        this.moduleOptions = config.moduleOptions ?? {};
        this.moduleDependencies = config.moduleDependencies;
        this.joinerConfig = config.joinerConfig ?? [];
        this.injectedDependencies = config.injectedDependencies ?? {};
        this.hooks = config.hooks ?? {};
        this.dbConfig = {
            clientUrl: (0, database_1.getDatabaseURL)(this.dbName),
            schema: this.schema,
            debug: this.debug,
        };
        this.setupProcessHandlers();
        this.initializeConfig(config.moduleModels);
    }
    setupProcessHandlers() {
        process.on("SIGTERM", async () => {
            await this.cleanup();
            process.exit(0);
        });
        process.on("SIGINT", async () => {
            await this.cleanup();
            process.exit(0);
        });
    }
    initializeConfig(moduleModels) {
        const moduleSdkImports = require("@medusajs/framework/modules-sdk");
        // Use a unique connection for all the entire suite
        this.connection = utils_1.ModulesSdkUtils.createPgConnection(this.dbConfig);
        const { MikroOrmWrapper, models } = createMikroOrmWrapper({
            moduleModels,
            resolve: this.resolve,
            dbConfig: this.dbConfig,
            cwd: this.cwd,
        });
        this.MikroOrmWrapper = MikroOrmWrapper;
        this.moduleModels = models;
        this.modulesConfig = {
            [this.moduleName]: {
                definition: moduleSdkImports.ModulesDefinition[this.moduleName],
                resolve: this.resolve,
                dependencies: this.moduleDependencies,
                options: {
                    database: this.dbConfig,
                    ...this.moduleOptions,
                    [utils_1.isSharedConnectionSymbol]: true,
                },
            },
        };
        this.moduleOptionsConfig = {
            injectedDependencies: {
                [utils_1.ContainerRegistrationKeys.PG_CONNECTION]: this.connection,
                [utils_1.Modules.EVENT_BUS]: new mock_event_bus_service_1.default(),
                [utils_1.ContainerRegistrationKeys.LOGGER]: console,
                [utils_1.ContainerRegistrationKeys.CONFIG_MODULE]: {
                    modules: this.modulesConfig,
                },
                ...this.injectedDependencies,
            },
            modulesConfig: this.modulesConfig,
            databaseConfig: this.dbConfig,
            joinerConfig: this.joinerConfig,
            preventConnectionDestroyWarning: true,
            cwd: this.cwd,
        };
    }
    createMedusaAppProxy() {
        return new Proxy({}, {
            get: (target, prop) => {
                return this.medusaApp?.[prop];
            },
        });
    }
    createServiceProxy() {
        return new Proxy({}, {
            get: (target, prop) => {
                return this.moduleService?.[prop];
            },
        });
    }
    async beforeAll() {
        try {
            this.setupProcessHandlers();
            process.env.LOG_LEVEL = "error";
        }
        catch (error) {
            await this.cleanup();
            throw error;
        }
    }
    async beforeEach() {
        try {
            if (this.moduleModels.length) {
                await this.MikroOrmWrapper.setupDatabase();
            }
            if (this.hooks?.beforeModuleInit) {
                await this.hooks.beforeModuleInit();
            }
            const output = await (0, init_modules_1.initModules)(this.moduleOptionsConfig);
            this.shutdown = output.shutdown;
            this.medusaApp = output.medusaApp;
            this.moduleService = output.medusaApp.modules[this.moduleName];
            if (this.hooks?.afterModuleInit) {
                await this.hooks.afterModuleInit(this.medusaApp, this.moduleService);
            }
        }
        catch (error) {
            logger_1.logger.error("Error in beforeEach:", error?.message);
            await this.cleanup();
            throw error;
        }
    }
    async afterEach() {
        try {
            if (this.moduleModels.length) {
                await this.MikroOrmWrapper.clearDatabase();
            }
            await this.shutdown();
            this.moduleService = {};
            this.medusaApp = {};
        }
        catch (error) {
            logger_1.logger.error("Error in afterEach:", error?.message);
            throw error;
        }
    }
    async cleanup() {
        try {
            process.removeAllListeners("SIGTERM");
            process.removeAllListeners("SIGINT");
            await this.connection?.context?.destroy();
            await this.connection?.destroy();
            this.moduleService = null;
            this.medusaApp = null;
            this.connection = null;
            if (global.gc) {
                global.gc();
            }
        }
        catch (error) {
            logger_1.logger.error("Error during cleanup:", error?.message);
        }
    }
    getOptions() {
        return {
            MikroOrmWrapper: this.MikroOrmWrapper,
            medusaApp: this.createMedusaAppProxy(),
            service: this.createServiceProxy(),
            dbConfig: {
                schema: this.schema,
                clientUrl: this.dbConfig.clientUrl,
            },
        };
    }
}
function moduleIntegrationTestRunner({ moduleName, moduleModels, moduleOptions = {}, moduleDependencies, joinerConfig = [], schema = "public", dbName, debug = false, testSuite, resolve, injectedDependencies = {}, cwd, hooks, }) {
    const runner = new ModuleTestRunner({
        moduleName,
        moduleModels,
        moduleOptions,
        moduleDependencies,
        joinerConfig,
        schema,
        dbName,
        debug,
        resolve,
        injectedDependencies,
        cwd,
        hooks,
    });
    return describe("", () => {
        let testOptions;
        beforeAll(async () => {
            await runner.beforeAll();
            testOptions = runner.getOptions();
        });
        beforeEach(async () => {
            await runner.beforeEach();
        });
        afterEach(async () => {
            await runner.afterEach();
        });
        afterAll(async () => {
            // Run main cleanup
            await runner.cleanup();
            // Clean references to the test options
            for (const key in testOptions) {
                if (typeof testOptions[key] === "function") {
                    testOptions[key] = null;
                }
                else if (typeof testOptions[key] === "object" &&
                    testOptions[key] !== null) {
                    Object.keys(testOptions[key]).forEach((k) => {
                        testOptions[key][k] = null;
                    });
                    testOptions[key] = null;
                }
            }
            // Encourage garbage collection
            // @ts-ignore
            testOptions = null;
            if (global.gc) {
                global.gc();
            }
        });
        // Run test suite with options
        testSuite(runner.getOptions());
    });
}
//# sourceMappingURL=module-test-runner.js.map