using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;

namespace Xunit
{
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public class FactAttribute : Attribute
    {
        public string? DisplayName { get; set; }
    }

    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public class TheoryAttribute : Attribute
    {
        public string? DisplayName { get; set; }
    }

    [AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
    public class InlineDataAttribute : Attribute
    {
        public object?[] Data { get; }
        public InlineDataAttribute(params object?[] data) => Data = data;
    }

    public class XunitException : Exception
    {
        public XunitException(string message) : base(message) { }
    }

    public static class Assert
    {
        public static void True(bool condition, string? userMessage = null)
        {
            if (!condition)
                throw new XunitException(userMessage ?? "Assert.True() Failure: Expected true, got false.");
        }

        public static void False(bool condition, string? userMessage = null)
        {
            if (condition)
                throw new XunitException(userMessage ?? "Assert.False() Failure: Expected false, got true.");
        }

        public static void Null(object? @object)
        {
            if (@object != null)
                throw new XunitException($"Assert.Null() Failure: Expected null, got '{@object}'.");
        }

        public static void NotNull(object? @object)
        {
            if (@object == null)
                throw new XunitException("Assert.NotNull() Failure: Value was null.");
        }

        public static void Equal<T>(T expected, T actual)
        {
            if (!EqualityComparer<T>.Default.Equals(expected, actual))
                throw new XunitException($"Assert.Equal() Failure:\n  Expected: {expected}\n  Actual:   {actual}");
        }

        public static void NotEqual<T>(T notExpected, T actual)
        {
            if (EqualityComparer<T>.Default.Equals(notExpected, actual))
                throw new XunitException($"Assert.NotEqual() Failure: Values were both '{actual}'.");
        }

        public static void Contains(string expectedSubstring, string? actualString, StringComparison comparisonType = StringComparison.Ordinal)
        {
            if (actualString == null || !actualString.Contains(expectedSubstring, comparisonType))
                throw new XunitException($"Assert.Contains() Failure:\n  Not found: '{expectedSubstring}'\n  In value:  '{actualString}'");
        }

        public static void Contains<T>(IEnumerable<T> collection, Predicate<T> filter)
        {
            if (!collection.Any(x => filter(x)))
                throw new XunitException("Assert.Contains() Failure: Filter matched no elements in collection.");
        }

        public static void Empty<T>(IEnumerable<T> collection)
        {
            if (collection.Any())
                throw new XunitException($"Assert.Empty() Failure: Collection had {collection.Count()} elements.");
        }

        public static void NotEmpty<T>(IEnumerable<T> collection)
        {
            if (!collection.Any())
                throw new XunitException("Assert.NotEmpty() Failure: Collection was empty.");
        }

        public static void Single<T>(IEnumerable<T> collection)
        {
            var count = collection.Count();
            if (count != 1)
                throw new XunitException($"Assert.Single() Failure: Expected 1 element, got {count}.");
        }

        public static T IsType<T>(object? @object)
        {
            if (@object is T typed) return typed;
            throw new XunitException($"Assert.IsType() Failure: Expected {typeof(T).Name}, got {@object?.GetType().Name ?? "null"}.");
        }

        public static async Task<TException> ThrowsAsync<TException>(Func<Task> testCode) where TException : Exception
        {
            try
            {
                await testCode();
            }
            catch (TException ex)
            {
                return ex;
            }
            catch (Exception ex)
            {
                throw new XunitException($"Assert.ThrowsAsync() Failure: Expected {typeof(TException).Name}, got {ex.GetType().Name}: {ex.Message}");
            }
            throw new XunitException($"Assert.ThrowsAsync() Failure: Expected {typeof(TException).Name} but no exception was thrown.");
        }
    }
}

namespace Aerocache.Tests.Framework
{
    public static class TestRunner
    {
        public static async Task<int> RunAllAsync()
        {
            var assembly = Assembly.GetExecutingAssembly();
            var testClasses = assembly.GetTypes()
                .Where(t => t.IsClass && !t.IsAbstract && t.GetMethods().Any(m =>
                    m.GetCustomAttribute<Xunit.FactAttribute>() != null ||
                    m.GetCustomAttribute<Xunit.TheoryAttribute>() != null))
                .OrderBy(t => t.Namespace)
                .ThenBy(t => t.Name)
                .ToList();

            int passed = 0;
            int failed = 0;
            var swTotal = Stopwatch.StartNew();

            Console.WriteLine("================================================================================");
            Console.WriteLine("  AEROCACHE MICROSERVICE TEST SUITE (Unit, Integration & E2E)");
            Console.WriteLine("================================================================================");

            foreach (var testClass in testClasses)
            {
                Console.WriteLine($"\n▶ Suite: {testClass.Name} ({testClass.Namespace})");
                Console.WriteLine(new string('-', 80));

                var methods = testClass.GetMethods(BindingFlags.Public | BindingFlags.Instance);
                foreach (var method in methods)
                {
                    var fact = method.GetCustomAttribute<Xunit.FactAttribute>();
                    var theory = method.GetCustomAttribute<Xunit.TheoryAttribute>();
                    if (fact == null && theory == null) continue;

                    var inlineDatas = method.GetCustomAttributes<Xunit.InlineDataAttribute>().ToList();
                    var invocations = inlineDatas.Any()
                        ? inlineDatas.Select(d => d.Data).ToList()
                        : new List<object?[]> { Array.Empty<object?>() };

                    foreach (var args in invocations)
                    {
                        var argSuffix = args.Length > 0 ? $"({string.Join(", ", args.Select(a => a ?? "null"))})" : "";
                        var testName = $"{method.Name}{argSuffix}";
                        var sw = Stopwatch.StartNew();

                        object? instance = null;
                        try
                        {
                            instance = Activator.CreateInstance(testClass);
                            var result = method.Invoke(instance, args);
                            if (result is Task task)
                            {
                                await task;
                            }
                            sw.Stop();
                            passed++;
                            Console.WriteLine($"  [PASS] {testName} ({sw.ElapsedMilliseconds} ms)");
                        }
                        catch (Exception ex)
                        {
                            sw.Stop();
                            failed++;
                            var inner = ex is TargetInvocationException tie && tie.InnerException != null ? tie.InnerException : ex;
                            Console.WriteLine($"  [FAIL] {testName} ({sw.ElapsedMilliseconds} ms)");
                            Console.WriteLine($"         -> {inner.GetType().Name}: {inner.Message}");
                        }
                        finally
                        {
                            if (instance is IAsyncDisposable asyncDisp)
                                await asyncDisp.DisposeAsync();
                            else if (instance is IDisposable disp)
                                disp.Dispose();
                        }
                    }
                }
            }

            swTotal.Stop();
            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"  TOTAL: {passed + failed} | PASSED: {passed} | FAILED: {failed} | TIME: {swTotal.ElapsedMilliseconds} ms");
            Console.WriteLine("================================================================================");

            return failed == 0 ? 0 : 1;
        }
    }
}
