package com.studypm.aiplan;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * OpenAI Responses APIへ渡すWBS下書きの厳格なJSON Schemaを構築する。
 */
public class AiWbsStructuredOutputSchema {

    private static final String DATE_PATTERN = "^\\d{4}-\\d{2}-\\d{2}$";

    private final ObjectMapper objectMapper;

    public AiWbsStructuredOutputSchema(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public JsonNode create() {
        ObjectNode project = object(
                properties(
                        property("name", string()),
                        property("description", string()),
                        property("startDate", date()),
                        property("targetEndDate", date())
                ),
                "name", "description", "startDate", "targetEndDate"
        );
        ObjectNode task = object(
                properties(
                        property("temporaryKey", string()),
                        property("taskType", enumeration("PARENT", "LEAF")),
                        property("parentTemporaryKey", nullableString()),
                        property("name", string()),
                        property("description", string()),
                        property("plannedStartDate", nullableDate()),
                        property("plannedEndDate", nullableDate()),
                        property("plannedHours", nullablePlannedHours()),
                        property("sourceTemporaryKeys", array(string()))
                ),
                "temporaryKey", "taskType", "parentTemporaryKey", "name", "description",
                "plannedStartDate", "plannedEndDate", "plannedHours", "sourceTemporaryKeys"
        );
        return object(
                properties(
                        property("project", project),
                        property("tasks", nonEmptyArray(task)),
                        property("wbsSplitUnit", enumeration("SECTION", "PAGE", "QUESTION_SET", "AI"))
                ),
                "project", "tasks", "wbsSplitUnit"
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

    private ObjectNode date() {
        ObjectNode result = string();
        result.put("pattern", DATE_PATTERN);
        return result;
    }

    private ObjectNode nullableDate() {
        ObjectNode result = nullableString();
        result.put("pattern", DATE_PATTERN);
        return result;
    }

    private ObjectNode nullablePlannedHours() {
        ObjectNode result = objectMapper.createObjectNode();
        result.set("type", arrayOf("number", "null"));
        result.put("minimum", 0.25);
        result.put("multipleOf", 0.25);
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
