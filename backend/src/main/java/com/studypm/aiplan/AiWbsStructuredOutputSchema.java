package com.studypm.aiplan;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * OpenAI Responses APIへ渡すWBS下書きの厳格なJSON Schemaを構築する。
 */
public class AiWbsStructuredOutputSchema {

    private final ObjectMapper objectMapper;

    public AiWbsStructuredOutputSchema(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public JsonNode create() {
        ObjectNode project = object(
                properties(
                        property("name", string()),
                        property("description", string())
                ),
                "name", "description"
        );
        ObjectNode outlineNode = object(
                properties(
                        property("temporaryKey", string()),
                        property("parentTemporaryKey", nullableString()),
                        property("name", string()),
                        property("description", string()),
                        property("plannedEffortHundredths", nullablePlannedEffortHundredths()),
                        property("sourceTemporaryKeys", array(string()))
                ),
                "temporaryKey", "parentTemporaryKey", "name", "description",
                "plannedEffortHundredths", "sourceTemporaryKeys"
        );
        return object(
                properties(
                        property("project", project),
                        property("outlineNodes", nonEmptyArray(outlineNode)),
                        property("wbsSplitUnit", enumeration("SECTION", "PAGE", "QUESTION_SET", "AI"))
                ),
                "project", "outlineNodes", "wbsSplitUnit"
        );
    }

    private ObjectNode object(ObjectNode properties, String... requiredNames) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("type", "object");
        result.set("properties", properties);
        result.set("required", arrayOf(requiredNames));
        result.put("additionalProperties", false);
        return result;
    }

    private ObjectNode properties(Property... values) {
        ObjectNode result = objectMapper.createObjectNode();
        for (Property value : values) {
            result.set(value.name(), value.schema());
        }
        return result;
    }

    private Property property(String name, JsonNode schema) {
        return new Property(name, schema);
    }

    private ObjectNode string() {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("type", "string");
        return result;
    }

    private ObjectNode nullableString() {
        ObjectNode result = objectMapper.createObjectNode();
        result.set("type", arrayOf("string", "null"));
        return result;
    }

    private ObjectNode nullablePlannedEffortHundredths() {
        ObjectNode result = objectMapper.createObjectNode();
        result.set("type", arrayOf("integer", "null"));
        result.put("minimum", 25);
        result.put("maximum", 999999);
        result.put("multipleOf", 25);
        return result;
    }

    private ObjectNode enumeration(String... values) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("type", "string");
        result.set("enum", arrayOf(values));
        return result;
    }

    private ObjectNode array(JsonNode items) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("type", "array");
        result.set("items", items);
        return result;
    }

    private ObjectNode nonEmptyArray(JsonNode items) {
        ObjectNode result = array(items);
        result.put("minItems", 1);
        return result;
    }

    private ArrayNode arrayOf(String... values) {
        ArrayNode result = objectMapper.createArrayNode();
        for (String value : values) {
            result.add(value);
        }
        return result;
    }

    private record Property(String name, JsonNode schema) {
    }
}
