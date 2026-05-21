/**
 * Babel plugin that replaces dynamic import(variable) expressions with
 * Promise.reject(...). Hermes bytecode compiler does not support dynamic
 * imports with non-literal arguments. Dependencies like @supabase use this
 * pattern to optionally load @opentelemetry/api, handling absence via .catch().
 */
module.exports = function ({ types: t }) {
  return {
    visitor: {
      CallExpression(path) {
        if (
          path.node.callee.type === 'Import' &&
          path.node.arguments.length > 0 &&
          path.node.arguments[0].type !== 'StringLiteral' &&
          path.node.arguments[0].type !== 'TemplateLiteral'
        ) {
          path.replaceWith(
            t.callExpression(
              t.memberExpression(t.identifier('Promise'), t.identifier('reject')),
              [
                t.newExpression(t.identifier('Error'), [
                  t.stringLiteral('Dynamic import with variable not supported'),
                ]),
              ]
            )
          );
        }
      },
    },
  };
};
