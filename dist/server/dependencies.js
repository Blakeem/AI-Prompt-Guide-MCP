/**
 * Dependency interfaces for the MCP server factory
 *
 * This module defines interfaces for all external dependencies used by the server,
 * enabling dependency inversion and improving testability. By abstracting dependencies
 * behind interfaces, the server factory becomes loosely coupled and easily testable
 * with mock implementations.
 *
 * ## Architecture Benefits
 *
 * - **Testability**: Dependencies can be mocked for unit testing
 * - **Flexibility**: Different implementations can be swapped without code changes
 * - **Separation of Concerns**: Business logic is separated from infrastructure
 * - **Configuration**: Behavior can be customized through dependency injection
 *
 * ## Usage Patterns
 *
 * ### Basic Usage (Default Dependencies)
 * ```typescript
 * const server = await createMCPServer();
 * ```
 *
 * ### Custom Dependencies (Testing)
 * ```typescript
 * const server = await createMCPServer({
 *   dependencies: {
 *     config: mockConfigProvider,
 *     logger: mockLoggerProvider
 *   }
 * });
 * ```
 *
 * ### Complete Custom Configuration
 * ```typescript
 * const customDependencies: ServerDependencies = {
 *   config: new CustomConfigProvider(),
 *   logger: new CustomLoggerProvider(),
 *   fileSystem: new CustomFileSystemProvider(),
 *   session: new CustomSessionProvider(),
 *   server: new CustomServerProvider(),
 *   handlers: new CustomHandlerProvider()
 * };
 *
 * const server = await createMCPServer({
 *   dependencies: customDependencies
 * });
 * ```
 */
export {};
//# sourceMappingURL=dependencies.js.map