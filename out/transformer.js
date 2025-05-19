"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformContext = void 0;
exports.default = transformer;
var typescript_1 = __importDefault(require("typescript"));
var TransformContext = /** @class */ (function () {
    function TransformContext(program, context, config) {
        this.program = program;
        this.context = context;
        this.config = config;
        this.factory = context.factory;
    }
    TransformContext.prototype.transform = function (node) {
        var _this = this;
        return typescript_1.default.visitEachChild(node, function (child) { return visitNode(_this, child); }, this.context);
    };
    return TransformContext;
}());
exports.TransformContext = TransformContext;
function visitNode(context, node) {
    if (typescript_1.default.isExpression(node)) {
        return visitExpression(context, node);
    }
    return context.transform(node);
}
function visitExpression(context, node) {
    var _a;
    var factory = context.factory;
    if (typescript_1.default.isCallExpression(node)) {
        var expression = node.expression;
        if (typescript_1.default.isIdentifier(expression)) {
            var logType = getLogType(expression.text);
            if (logType) {
                var emoji = getEmojiForLogType(logType);
                var utf8Bytes = convertToUtf8Bytes(emoji);
                var sourceFile = node.getSourceFile();
                var line = typescript_1.default.getLineAndCharacterOfPosition(sourceFile, node.getStart()).line;
                var fileName = (_a = sourceFile.fileName.split(/[\\/]/).pop()) !== null && _a !== void 0 ? _a : "unknown";
                var locationText = "[".concat(fileName, ":").concat(line + 1, "]");
                var emojiExpression = factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("string"), factory.createIdentifier("char")), undefined, utf8Bytes.map(function (b) { return factory.createNumericLiteral(b); }));
                var fullPrefix = factory.createBinaryExpression(emojiExpression, typescript_1.default.SyntaxKind.PlusToken, factory.createStringLiteral(" ".concat(locationText)));
                return factory.createCallExpression(factory.createIdentifier("print"), undefined, __spreadArray([
                    fullPrefix
                ], __read(node.arguments), false));
            }
        }
    }
    return context.transform(node);
}
function getLogType(name) {
    switch (name) {
        case "$loginfo":
            return "info";
        case "$logwarn":
            return "warn";
        case "$logerror":
            return "error";
        case "$logsuccess":
            return "success";
        default:
            return undefined;
    }
}
// 💡 You just type the emoji normally here
function getEmojiForLogType(type) {
    switch (type) {
        case "info":
            return "🔵";
        case "warn":
            return "🟡";
        case "error":
            return "🔴";
        case "success":
            return "🟢";
    }
}
// 🔁 Convert emoji to its UTF-8 byte array
function convertToUtf8Bytes(char) {
    var buffer = Buffer.from(char, "utf8");
    return Array.from(buffer);
}
function transformer(program, config) {
    return function (context) {
        var transformContext = new TransformContext(program, context, config);
        return function (file) {
            var transformed = transformContext.transform(file);
            return typescript_1.default.factory.updateSourceFile(transformed, __spreadArray([], __read(transformed.statements), false), true);
        };
    };
}
