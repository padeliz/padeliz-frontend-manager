/**
 * Player custom field values: history table (with review status), submit form.
 */

import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useToast } from '@/context/ToastContext';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { EventsApiService } from '@/services/api/eventsApi';
import { PlayerCustomFieldsApiService } from '@/services/api/playerCustomFieldsApi';
import {
  PlayerCustomFieldValuesApiService,
  PlayerCustomFieldValueSubmitPayload,
} from '@/services/api/playerCustomFieldValuesApi';
import {
  ApiPlayerCustomField,
  ApiPlayerCustomFieldValue,
} from '@/types/api/entities';
import { DropdownOption } from '@/types/ui/dropdowns';
import {
  allowedStrings,
  buildRacketExperienceValue,
  emptyRacketExperienceEntry,
  formatJsonFieldValue,
  isJsonField,
  isRacketExperienceField,
  parseJsonDraft,
  RACKET_EXPERIENCE_MEASURES,
  RacketExperienceDraftEntry,
} from '@/utils/customFieldJson';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';

const valuesApi = new PlayerCustomFieldValuesApiService();
const fieldsApi = new PlayerCustomFieldsApiService();
const eventsApi = new EventsApiService();

type Props = {
  playerId: number;
};

function formatTimestamp(ts?: number | null): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString();
}

const REVIEW_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  validated: 'Validated',
  rejected: 'Rejected',
  discarded: 'Discarded',
};

const REVIEW_STATUS_CLASS: Record<string, string> = {
  pending: 'text-amber-700',
  validated: 'text-green-700',
  rejected: 'text-red-600',
  discarded: 'text-gray-500',
};

function displayValue(value: ApiPlayerCustomFieldValue): string {
  if (isJsonField(value.field)) {
    return formatJsonFieldValue(value.field, value.value_json ?? value.value);
  }
  if (value.value != null && value.value !== '') {
    return String(value.value);
  }
  if (value.selected_options?.length) {
    return value.selected_options
      .map(opt => opt.option_label_snapshot)
      .join(', ');
  }
  return '—';
}

export default function PlayerCustomFieldsPanel({ playerId }: Props) {
  const { showSuccess, showError } = useToast();
  const [values, setValues] = useState<ApiPlayerCustomFieldValue[]>([]);
  const [fields, setFields] = useState<ApiPlayerCustomField[]>([]);
  const [eventOptions, setEventOptions] = useState<DropdownOption[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [textValue, setTextValue] = useState('');
  const [intValue, setIntValue] = useState('');
  const [boolValue, setBoolValue] = useState(false);
  const [dateValue, setDateValue] = useState('');
  const [optionId, setOptionId] = useState<number | null>(null);
  const [optionIds, setOptionIds] = useState<number[]>([]);
  const [jsonText, setJsonText] = useState('');
  const [racketEntries, setRacketEntries] = useState<
    RacketExperienceDraftEntry[]
  >([emptyRacketExperienceEntry()]);
  const submitStatus = useActionButtonStatus({ auditoryFeedback: true });

  const selectedField = useMemo(
    () => fields.find(f => f.id_player_custom_field === selectedFieldId) ?? null,
    [fields, selectedFieldId]
  );

  const fieldOptions: DropdownOption[] = useMemo(
    () =>
      fields.map(field => ({
        label: field.label,
        value: field.id_player_custom_field,
      })),
    [fields]
  );

  const selectOptions: DropdownOption[] = useMemo(() => {
    if (!selectedField?.options) return [];
    return selectedField.options
      .filter(opt => opt.is_active)
      .map(opt => ({
        label: opt.label,
        value: opt.id_player_custom_field_option,
      }));
  }, [selectedField]);

  const loadCatalog = useCallback(async () => {
    try {
      const [fieldsRes, eventsRes] = await Promise.all([
        fieldsApi.getPlayerCustomFields({
          per_page: 100,
          sort_by: { sort_order: 'asc' },
        }),
        eventsApi.getEvents({
          per_page: 100,
          sort_by: { name: 'asc' },
        }),
      ]);
      setFields(
        (fieldsRes.data ?? []).filter(field => field.archived_at == null)
      );
      setEventOptions(
        (eventsRes.data ?? []).map(event => ({
          label: event.name,
          value: event.id_event,
        }))
      );
    } catch (err: any) {
      showError('Load failed', err?.message || 'Could not load custom fields');
    }
  }, []);

  const loadValues = useCallback(async () => {
    setLoading(true);
    try {
      const response = await valuesApi.getValues(playerId, {
        page,
        per_page: 10,
        sort_by: { inserted_at: 'desc' },
      });
      setValues(response.data ?? []);
      setLastPage(response.meta?.last_page ?? 1);
    } catch (err: any) {
      showError('Load failed', err?.message || 'Could not load values');
    } finally {
      setLoading(false);
    }
  }, [page, playerId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    void loadValues();
  }, [loadValues]);

  const resetInput = () => {
    setTextValue('');
    setIntValue('');
    setBoolValue(false);
    setDateValue('');
    setOptionId(null);
    setOptionIds([]);
    setJsonText('');
    setRacketEntries([emptyRacketExperienceEntry()]);
  };

  const jsonErrorRef = React.useRef<string | null>(null);

  const buildPayload = (): PlayerCustomFieldValueSubmitPayload | null => {
    if (!selectedField) return null;
    const payload: PlayerCustomFieldValueSubmitPayload = {
      player_custom_field_id: selectedField.id_player_custom_field,
      event_id: eventId,
    };
    switch (selectedField.type) {
      case 'text':
        payload.value = textValue.trim() || null;
        break;
      case 'integer':
        payload.value = intValue.trim() ? Number(intValue) : null;
        break;
      case 'boolean':
        payload.value = boolValue;
        break;
      case 'date':
        payload.value = dateValue.trim() || null;
        break;
      case 'single_select':
        if (optionId == null) return null;
        payload.option_id = optionId;
        break;
      case 'multi_select':
        if (optionIds.length === 0) return null;
        payload.option_ids = optionIds;
        break;
      case 'json': {
        const built = isRacketExperienceField(selectedField)
          ? buildRacketExperienceValue(racketEntries)
          : parseJsonDraft(jsonText);
        if (!built.ok) {
          jsonErrorRef.current = built.error;
          return null;
        }
        payload.value = built.value as PlayerCustomFieldValueSubmitPayload['value'];
        break;
      }
      default:
        return null;
    }
    return payload;
  };

  const onSubmit = async () => {
    jsonErrorRef.current = null;
    const payload = buildPayload();
    if (!payload) {
      const message =
        jsonErrorRef.current ?? 'Complete the value for the selected field.';
      showError('Validation', message);
      throw new Error(message);
    }
    try {
      await valuesApi.createValue(playerId, payload);
    } catch (err: any) {
      showError('Submit failed', err?.message || 'Could not submit value');
      throw err;
    }
    showSuccess('Submitted', 'Custom field value saved');
    resetInput();
    setPage(1);
    await loadValues();
  };

  const toggleMultiOption = (id: number) => {
    setOptionIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const updateRacketEntry = (
    index: number,
    patch: Partial<RacketExperienceDraftEntry>
  ) => {
    setRacketEntries(prev =>
      prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    );
  };

  const renderRacketExperienceInput = () => {
    const sports = allowedStrings(selectedField?.rules_json, 'sports');
    const levels = allowedStrings(selectedField?.rules_json, 'levels');
    const toOptions = (items: string[]): DropdownOption[] =>
      items.map(item => ({ label: item, value: item }));
    return (
      <View testID="custom-field-value-racket-experience">
        {racketEntries.map((entry, index) => (
          <View
            key={index}
            testID={`racket-entry-${index}`}
            className="border border-gray-200 rounded-lg p-3 mb-2 bg-white"
          >
            <View className="mb-2">
              {sports.length > 0 ? (
                <SingleSelectDropdown
                  options={toOptions(sports)}
                  selectedValue={entry.sport || null}
                  onSelectionChange={value =>
                    updateRacketEntry(index, {
                      sport: value == null ? '' : String(value),
                    })
                  }
                  placeholder="Sport"
                  title="Sport"
                  clearable
                />
              ) : (
                <AppTextInput
                  testID={`racket-sport-${index}`}
                  value={entry.sport}
                  onChangeText={v => updateRacketEntry(index, { sport: v })}
                  placeholder="Sport"
                  className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                />
              )}
            </View>
            <View className="mb-2">
              {levels.length > 0 ? (
                <SingleSelectDropdown
                  options={toOptions(levels)}
                  selectedValue={entry.level || null}
                  onSelectionChange={value =>
                    updateRacketEntry(index, {
                      level: value == null ? '' : String(value),
                    })
                  }
                  placeholder="Level"
                  title="Level"
                  clearable
                />
              ) : (
                <AppTextInput
                  testID={`racket-level-${index}`}
                  value={entry.level}
                  onChangeText={v => updateRacketEntry(index, { level: v })}
                  placeholder="Level"
                  className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                />
              )}
            </View>
            <View className="flex-row flex-wrap gap-2">
              {RACKET_EXPERIENCE_MEASURES.map(measure => (
                <AppTextInput
                  key={measure}
                  testID={`racket-${measure}-${index}`}
                  value={entry[measure]}
                  onChangeText={v =>
                    updateRacketEntry(index, { [measure]: v })
                  }
                  placeholder={measure.replace(/_/g, ' ')}
                  keyboardType="numeric"
                  className="border border-gray-300 rounded-lg px-3 py-2 bg-white flex-1"
                  style={{ minWidth: 110 }}
                />
              ))}
            </View>
            {racketEntries.length > 1 ? (
              <Pressable
                testID={`racket-remove-${index}`}
                onPress={() =>
                  setRacketEntries(prev => prev.filter((_, i) => i !== index))
                }
                className="self-start mt-2 bg-red-50 rounded px-2 py-1"
              >
                <Text className="text-red-700 text-xs">Remove</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable
          testID="racket-add-entry"
          onPress={() =>
            setRacketEntries(prev => [...prev, emptyRacketExperienceEntry()])
          }
          className="self-start bg-gray-100 rounded px-3 py-1"
        >
          <Text className="text-sm text-gray-700">Add sport</Text>
        </Pressable>
      </View>
    );
  };

  const renderValueInput = () => {
    if (!selectedField) {
      return (
        <Text className="text-sm text-gray-500">
          Select a field to enter a value.
        </Text>
      );
    }
    switch (selectedField.type) {
      case 'text':
        return (
          <AppTextInput
            testID="custom-field-value-text"
            value={textValue}
            onChangeText={setTextValue}
            placeholder="Text value"
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          />
        );
      case 'integer':
        return (
          <AppTextInput
            testID="custom-field-value-integer"
            value={intValue}
            onChangeText={setIntValue}
            placeholder="Integer value"
            keyboardType="numeric"
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          />
        );
      case 'boolean':
        return (
          <View className="flex-row items-center" testID="custom-field-value-boolean">
            <Switch value={boolValue} onValueChange={setBoolValue} />
            <Text className="ml-2 text-sm text-gray-700">
              {boolValue ? 'Yes' : 'No'}
            </Text>
          </View>
        );
      case 'date':
        return (
          <AppTextInput
            testID="custom-field-value-date"
            value={dateValue}
            onChangeText={setDateValue}
            placeholder="YYYY-MM-DD"
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          />
        );
      case 'single_select':
        return (
          <View testID="custom-field-value-single-select">
            <SingleSelectDropdown
              options={selectOptions}
              selectedValue={optionId}
              onSelectionChange={value =>
                setOptionId(value == null ? null : Number(value))
              }
              placeholder="Select option"
              title="Option"
              clearable
            />
          </View>
        );
      case 'multi_select':
        return (
          <View testID="custom-field-value-multi-select">
            {selectOptions.map(opt => (
              <Pressable
                key={String(opt.value)}
                testID={`multi-option-${opt.value}`}
                onPress={() => toggleMultiOption(Number(opt.value))}
                className="flex-row items-center py-1"
              >
                <View
                  className={`w-4 h-4 mr-2 rounded border items-center justify-center ${
                    optionIds.includes(Number(opt.value))
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-400 bg-white'
                  }`}
                >
                  {optionIds.includes(Number(opt.value)) ? (
                    <Text className="text-white text-xs">✓</Text>
                  ) : null}
                </View>
                <Text className="text-sm text-gray-800">{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        );
      case 'json':
        if (isRacketExperienceField(selectedField)) {
          return renderRacketExperienceInput();
        }
        return (
          <AppTextInput
            testID="custom-field-value-json"
            value={jsonText}
            onChangeText={setJsonText}
            placeholder='{"key": "value"}'
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white font-mono"
            style={{ minHeight: 96 }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView className="flex-1 p-4" testID="player-custom-fields-panel">
      <View className="mb-6 border border-gray-200 rounded-lg p-4 bg-white">
        <Text className="text-base font-medium text-gray-900 mb-3">
          Submit value
        </Text>
        <View className="mb-3" testID="custom-field-select">
          <SingleSelectDropdown
            options={fieldOptions}
            selectedValue={selectedFieldId}
            onSelectionChange={value => {
              setSelectedFieldId(value == null ? null : Number(value));
              resetInput();
            }}
            placeholder="Select field"
            title="Field"
            clearable
          />
        </View>
        <View className="mb-3">{renderValueInput()}</View>
        <View className="mb-3" testID="custom-field-event-select">
          <SingleSelectDropdown
            options={eventOptions}
            selectedValue={eventId}
            onSelectionChange={value =>
              setEventId(value == null ? null : Number(value))
            }
            placeholder="Event (optional)"
            title="Event"
            clearable
          />
        </View>
        <View className="self-start">
          <ActionButton
            testID="custom-field-submit"
            label="Submit"
            variant="primary"
            disabled={!selectedFieldId}
            disabledReason="Select a field first."
            status={submitStatus.status}
            errorMessage={submitStatus.errorMessage ?? undefined}
            onPress={() => void submitStatus.run(onSubmit)}
          />
        </View>
      </View>

      <Text className="text-base font-medium text-gray-900 mb-3">History</Text>
      {loading ? (
        <ActivityIndicator testID="player-custom-fields-loading" />
      ) : values.length === 0 ? (
        <Text className="text-gray-500">No custom field values yet.</Text>
      ) : (
        values.map(row => {
          const status = row.review_status ?? 'pending';
          const isCurrent = status === 'validated';
          return (
            <View
              key={row.id_player_custom_field_value}
              testID={`custom-field-value-row-${row.id_player_custom_field_value}`}
              className={`border rounded-lg p-3 mb-2 ${
                status === 'rejected'
                  ? 'border-red-200 bg-red-50 opacity-80'
                  : status === 'discarded'
                    ? 'border-gray-200 bg-gray-50 opacity-70'
                    : 'border-gray-200 bg-white'
              }`}
            >
              <Text className="text-sm font-medium text-gray-900">
                {row.field?.label ?? `Field #${row.player_custom_field_id}`}
              </Text>
              <Text className="text-sm text-gray-700">
                Value: {displayValue(row)}
              </Text>
              <Text className="text-xs text-gray-500">
                Event: {row.event?.name ?? '—'}
              </Text>
              <Text className="text-xs text-gray-500">
                Submitted: {formatTimestamp(row.inserted_at)}
              </Text>
              <Text
                testID={`custom-field-review-status-${row.id_player_custom_field_value}`}
                className={`text-xs mt-1 ${REVIEW_STATUS_CLASS[status] ?? 'text-gray-600'}`}
              >
                Status: {REVIEW_STATUS_LABEL[status] ?? status}
                {isCurrent ? ' (current)' : ''}
                {row.reviewed_at
                  ? ` — reviewed ${formatTimestamp(row.reviewed_at)}`
                  : ''}
              </Text>
            </View>
          );
        })
      )}

      {lastPage > 1 ? (
        <View className="flex-row items-center justify-center gap-3 mt-4">
          <Pressable
            testID="custom-fields-prev-page"
            disabled={page <= 1 || loading}
            onPress={() => setPage(p => Math.max(1, p - 1))}
            className="bg-gray-100 rounded px-3 py-1"
          >
            <Text className="text-sm text-gray-700">Previous</Text>
          </Pressable>
          <Text className="text-sm text-gray-600">
            Page {page} of {lastPage}
          </Text>
          <Pressable
            testID="custom-fields-next-page"
            disabled={page >= lastPage || loading}
            onPress={() => setPage(p => p + 1)}
            className="bg-gray-100 rounded px-3 py-1"
          >
            <Text className="text-sm text-gray-700">Next</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
