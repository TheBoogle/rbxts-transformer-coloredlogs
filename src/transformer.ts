import ts from "typescript";

export interface TransformerConfig {}

export class TransformContext {
	public factory: ts.NodeFactory;

	constructor(
		public program: ts.Program,
		public context: ts.TransformationContext,
		public config: TransformerConfig,
	) {
		this.factory = context.factory;
	}

	transform<T extends ts.Node>(node: T): T {
		return ts.visitEachChild(node, (child) => visitNode(this, child), this.context);
	}
}

function visitNode(context: TransformContext, node: ts.Node): ts.Node {
	if (ts.isExpression(node)) {
		return visitExpression(context, node);
	}
	return context.transform(node);
}

function visitExpression(context: TransformContext, node: ts.Expression): ts.Expression {
	const { factory } = context;

	if (ts.isCallExpression(node)) {
		const expression = node.expression;
		if (ts.isIdentifier(expression)) {
			const logType = getLogType(expression.text);
			if (logType) {
				const emoji = getEmojiForLogType(logType);
				const utf8Bytes = convertToUtf8Bytes(emoji);

				const sourceFile = node.getSourceFile();
				const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
				const fileName = sourceFile.fileName.split(/[\\/]/).pop() ?? "unknown";
				const locationText = `[${fileName}:${line + 1}]`;

				const emojiExpression = factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier("string"),
						factory.createIdentifier("char"),
					),
					undefined,
					utf8Bytes.map((b) => factory.createNumericLiteral(b)),
				);

				const fullPrefix = factory.createBinaryExpression(
					emojiExpression,
					ts.SyntaxKind.PlusToken,
					factory.createStringLiteral(` ${locationText}`),
				);

				return factory.createCallExpression(factory.createIdentifier("print"), undefined, [
					fullPrefix,
					...node.arguments,
				]);
			}
		}
	}

	return context.transform(node);
}

function getLogType(name: string): "info" | "warn" | "error" | "success" | undefined {
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
function getEmojiForLogType(type: "info" | "warn" | "error" | "success"): string {
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
function convertToUtf8Bytes(char: string): number[] {
	const buffer = Buffer.from(char, "utf8");
	return Array.from(buffer);
}

export default function transformer(
	program: ts.Program,
	config: TransformerConfig,
): ts.TransformerFactory<ts.SourceFile> {
	return (context: ts.TransformationContext) => {
		const transformContext = new TransformContext(program, context, config);
		return (file: ts.SourceFile) => {
			const transformed = transformContext.transform(file);
			return ts.factory.updateSourceFile(transformed, [...transformed.statements], true);
		};
	};
}
