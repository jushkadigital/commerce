import { TestDatabase } from "./database";
export interface SuiteOptions<TService = unknown> {
    MikroOrmWrapper: TestDatabase;
    medusaApp: any;
    service: TService;
    dbConfig: {
        schema: string;
        clientUrl: string;
    };
}
interface ModuleTestRunnerConfig<TService = any> {
    moduleName: string;
    moduleModels?: any[];
    moduleOptions?: Record<string, any>;
    moduleDependencies?: string[];
    joinerConfig?: any[];
    schema?: string;
    dbName?: string;
    injectedDependencies?: Record<string, any>;
    resolve?: string;
    debug?: boolean;
    cwd?: string;
    hooks?: {
        beforeModuleInit?: () => Promise<void>;
        afterModuleInit?: (medusaApp: any, service: TService) => Promise<void>;
    };
}
export declare function moduleIntegrationTestRunner<TService = any>({ moduleName, moduleModels, moduleOptions, moduleDependencies, joinerConfig, schema, dbName, debug, testSuite, resolve, injectedDependencies, cwd, hooks, }: {
    moduleName: string;
    moduleModels?: any[];
    moduleOptions?: Record<string, any>;
    moduleDependencies?: string[];
    joinerConfig?: any[];
    schema?: string;
    dbName?: string;
    injectedDependencies?: Record<string, any>;
    resolve?: string;
    debug?: boolean;
    cwd?: string;
    hooks?: ModuleTestRunnerConfig<TService>["hooks"];
    testSuite: (options: SuiteOptions<TService>) => void;
}): void;
export {};
//# sourceMappingURL=module-test-runner.d.ts.map