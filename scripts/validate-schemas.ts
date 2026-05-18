// @ts-nocheck
import Ajv2020 from 'ajv/dist/2020.js';
import { readdir, readFile } from 'node:fs/promises';

const schemaDir = new URL('../schemas/', import.meta.url);
const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addFormat('date-time', true);
ajv.addFormat('email', true);
ajv.addFormat('uri', true);

const entries = await readdir(schemaDir);
const schemaFiles = entries.filter((entry) => entry.endsWith('.schema.json')).sort();

if (schemaFiles.length === 0) {
  throw new Error('No schema files found in schemas/.');
}

const failures: string[] = [];
const schemas: Array<{ file: string; schema: unknown }> = [];

for (const file of schemaFiles) {
  const schemaUrl = new URL(file, schemaDir);
  const schema = JSON.parse(await readFile(schemaUrl, 'utf8'));
  schemas.push({ file, schema });

  const isValidSchema = ajv.validateSchema(schema);

  if (!isValidSchema) {
    failures.push(`${file}: ${ajv.errorsText(ajv.errors)}`);
  }
}

for (const { file, schema } of schemas) {
  try {
    ajv.addSchema(schema);
  } catch (error) {
    failures.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const { file, schema } of schemas) {
  try {
    const id = schema.$id ?? file;
    const validate = ajv.getSchema(id);
    if (!validate) {
      failures.push(`${file}: schema was not registered`);
    }
  } catch (error) {
    failures.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Schema validation failed:\n${failures.join('\n')}`);
}

console.log(`Validated ${schemaFiles.length} schema files.`);
