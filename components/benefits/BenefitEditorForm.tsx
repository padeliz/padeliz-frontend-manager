/**
 * Benefit definition editor — effect, scope, conditions, stacking, active.
 */

import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import DateTimeFormInput from '@/components/ui/DateTimeFormInput';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { ClubsApiService } from '@/services/api/clubsApi';
import { EventsApiService } from '@/services/api/eventsApi';
import {
  ApiBenefitConditionType,
  ApiBenefitDefinition,
} from '@/types/api/entities';
import { DropdownOption } from '@/types/ui/dropdowns';
import { dayYmdFromUnix } from '@/utils/productDateTime';
import {
  BENEFIT_AMOUNT_TYPE_OPTIONS,
  BENEFIT_CONDITION_TYPE_OPTIONS,
  BENEFIT_EXCLUSIVITY_OPTIONS,
  BENEFIT_SCOPE_TYPE_OPTIONS,
  BenefitFormState,
  EMPTY_BENEFIT_FORM,
  benefitToFormState,
  conditionParametersText,
  formStateToPayload,
  parseConditionParameters,
} from '@/utils/benefitForm';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

const clubsApi = new ClubsApiService();
const eventsApi = new EventsApiService();

type Props = {
  initial?: ApiBenefitDefinition | null;
  submitting?: boolean;
  errors?: Record<string, string[]>;
  onSubmit: (payload: ReturnType<typeof formStateToPayload>) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  readOnlySystem?: boolean;
};

function FieldError({
  field,
  errors,
}: {
  field: string;
  errors?: Record<string, string[]>;
}) {
  const messages = errors?.[field];
  if (!messages?.length) return null;
  return (
    <>
      {messages.map(message => (
        <Text
          key={message}
          testID={`benefit-error-${field}`}
          className="text-red-600 text-sm mt-1"
        >
          {message}
        </Text>
      ))}
    </>
  );
}

export default function BenefitEditorForm({
  initial,
  submitting = false,
  errors,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  readOnlySystem = false,
}: Props) {
  const [form, setForm] = useState<BenefitFormState>(
    initial ? benefitToFormState(initial) : EMPTY_BENEFIT_FORM
  );
  const [clubOptions, setClubOptions] = useState<DropdownOption[]>([]);
  const [eventOptions, setEventOptions] = useState<DropdownOption[]>([]);
  const [conditionParamDrafts, setConditionParamDrafts] = useState<string[]>(
    () =>
      (initial?.conditions ?? []).map(c =>
        conditionParametersText({
          condition_type: c.condition_type,
          parameters: c.parameters,
        })
      )
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setForm(benefitToFormState(initial));
      setConditionParamDrafts(
        (initial.conditions ?? []).map(c =>
          conditionParametersText({
            condition_type: c.condition_type,
            parameters: c.parameters,
          })
        )
      );
    }
  }, [initial]);

  useEffect(() => {
    void clubsApi
      .getClubs({ page: 1, per_page: 100 })
      .then(res => {
        setClubOptions(
          (res.data || []).map(c => ({
            label: c.name,
            value: c.id_club,
          }))
        );
      })
      .catch(() => setClubOptions([]));
    void eventsApi
      .getEvents({ page: 1, per_page: 100, sort_by: { event_starts_at: 'desc' } })
      .then(res => {
        setEventOptions(
          (res.data || []).map(e => ({
            label: `${e.name} (${dayYmdFromUnix(e.event_starts_at)})`,
            value: e.id_event,
          }))
        );
      })
      .catch(() => setEventOptions([]));
  }, []);

  const update = useCallback(
    <K extends keyof BenefitFormState>(key: K, value: BenefitFormState[K]) => {
      setForm(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const addCondition = () => {
    setForm(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { condition_type: 'student_proof_active', parameters: null },
      ],
    }));
    setConditionParamDrafts(prev => [...prev, '']);
  };

  const removeCondition = (index: number) => {
    setForm(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
    setConditionParamDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLocalError(null);
    try {
      const conditions = form.conditions.map((c, i) => ({
        condition_type: c.condition_type,
        parameters: parseConditionParameters(conditionParamDrafts[i] ?? ''),
      }));
      await onSubmit(formStateToPayload({ ...form, conditions }));
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setLocalError('Condition parameters must be valid JSON.');
        return;
      }
      throw err;
    }
  };

  const disabled = submitting || (readOnlySystem && !!initial?.is_system);

  return (
    <View testID="benefit-editor-form" className="gap-4">
      {initial?.is_system ? (
        <Text
          testID="benefit-system-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2"
        >
          System benefits are limited — core identity fields stay protected.
        </Text>
      ) : null}

      {localError ? (
        <Text testID="benefit-local-error" className="text-red-600 text-sm">
          {localError}
        </Text>
      ) : null}

      <View className="bg-white border border-gray-200 rounded-lg p-4 gap-3">
        <Text className="text-base font-semibold text-gray-800">Identity</Text>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Slug *</Text>
          <AppTextInput
            testID="benefit-slug"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.slug}
            editable={!disabled && !initial?.is_system}
            onChangeText={text => update('slug', text)}
          />
          <FieldError field="slug" errors={errors} />
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Name *</Text>
          <AppTextInput
            testID="benefit-name"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.name}
            editable={!disabled}
            onChangeText={text => update('name', text)}
          />
          <FieldError field="name" errors={errors} />
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Description
          </Text>
          <AppTextInput
            testID="benefit-description"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            multiline
            value={form.description}
            editable={!disabled}
            onChangeText={text => update('description', text)}
          />
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-700">Active</Text>
          <Switch
            testID="benefit-is-active"
            value={form.is_active}
            disabled={disabled}
            onValueChange={value => update('is_active', value)}
          />
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-700">
            Player optional
          </Text>
          <Switch
            testID="benefit-player-optional"
            value={form.player_optional}
            disabled={disabled}
            onValueChange={value => update('player_optional', value)}
          />
        </View>
      </View>

      <View className="bg-white border border-gray-200 rounded-lg p-4 gap-3">
        <Text className="text-base font-semibold text-gray-800">Effect</Text>
        <SingleSelectDropdown
          title="Amount type *"
          options={BENEFIT_AMOUNT_TYPE_OPTIONS}
          selectedValue={form.amount_type}
          disabled={disabled}
          onSelectionChange={v =>
            update('amount_type', String(v) as BenefitFormState['amount_type'])
          }
        />
        <FieldError field="amount_type" errors={errors} />
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Amount value *
          </Text>
          <AppTextInput
            testID="benefit-amount-value"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            keyboardType="numeric"
            value={form.amount_value}
            editable={!disabled}
            onChangeText={text => update('amount_value', text)}
          />
          <FieldError field="amount_value" errors={errors} />
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Max discount RON
          </Text>
          <AppTextInput
            testID="benefit-max-discount"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            keyboardType="numeric"
            value={form.max_discount_ron}
            editable={!disabled}
            onChangeText={text => update('max_discount_ron', text)}
          />
        </View>
      </View>

      <View className="bg-white border border-gray-200 rounded-lg p-4 gap-3">
        <Text className="text-base font-semibold text-gray-800">Scope</Text>
        <SingleSelectDropdown
          title="Scope type *"
          options={BENEFIT_SCOPE_TYPE_OPTIONS}
          selectedValue={form.scope_type}
          disabled={disabled}
          onSelectionChange={v =>
            update('scope_type', String(v) as BenefitFormState['scope_type'])
          }
        />
        <FieldError field="scope_type" errors={errors} />
        {form.scope_type === 'club' ? (
          <SingleSelectDropdown
            title="Club"
            options={clubOptions}
            selectedValue={form.club_id}
            disabled={disabled}
            clearable
            onSelectionChange={v =>
              update('club_id', v == null || v === '' ? null : Number(v))
            }
          />
        ) : null}
        {form.scope_type === 'event' ? (
          <MultiSelectDropdown
            title="Events"
            options={eventOptions}
            selectedValues={form.event_ids}
            disabled={disabled}
            onSelectionChange={values =>
              update(
                'event_ids',
                values.map(v => Number(v)).filter(Number.isFinite)
              )
            }
          />
        ) : null}
        {form.scope_type === 'date_range' ? (
          <View className="gap-3">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Valid from
              </Text>
              <DateTimeFormInput
                inputType="datetime"
                value={
                  form.valid_from != null
                    ? new Date(form.valid_from * 1000)
                    : null
                }
                disabled={disabled}
                onChange={date =>
                  update(
                    'valid_from',
                    date ? Math.floor(date.getTime() / 1000) : null
                  )
                }
              />
            </View>
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Valid until
              </Text>
              <DateTimeFormInput
                inputType="datetime"
                value={
                  form.valid_until != null
                    ? new Date(form.valid_until * 1000)
                    : null
                }
                disabled={disabled}
                onChange={date =>
                  update(
                    'valid_until',
                    date ? Math.floor(date.getTime() / 1000) : null
                  )
                }
              />
            </View>
          </View>
        ) : null}
      </View>

      <View className="bg-white border border-gray-200 rounded-lg p-4 gap-3">
        <Text className="text-base font-semibold text-gray-800">Stacking</Text>
        <SingleSelectDropdown
          title="Exclusivity *"
          options={BENEFIT_EXCLUSIVITY_OPTIONS}
          selectedValue={form.exclusivity}
          disabled={disabled}
          onSelectionChange={v =>
            update(
              'exclusivity',
              String(v) as BenefitFormState['exclusivity']
            )
          }
        />
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Stack group
          </Text>
          <AppTextInput
            testID="benefit-stack-group"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.stack_group}
            editable={!disabled}
            onChangeText={text => update('stack_group', text)}
          />
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Priority
          </Text>
          <AppTextInput
            testID="benefit-priority"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            keyboardType="numeric"
            value={form.priority}
            editable={!disabled}
            onChangeText={text => update('priority', text)}
          />
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Max redemptions / player
          </Text>
          <AppTextInput
            testID="benefit-max-per-player"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            keyboardType="numeric"
            value={form.max_redemptions_per_player}
            editable={!disabled}
            onChangeText={text => update('max_redemptions_per_player', text)}
          />
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Max redemptions / event
          </Text>
          <AppTextInput
            testID="benefit-max-per-event"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            keyboardType="numeric"
            value={form.max_redemptions_per_event}
            editable={!disabled}
            onChangeText={text => update('max_redemptions_per_event', text)}
          />
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Max redemptions global
          </Text>
          <AppTextInput
            testID="benefit-max-global"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            keyboardType="numeric"
            value={form.max_redemptions_global}
            editable={!disabled}
            onChangeText={text => update('max_redemptions_global', text)}
          />
        </View>
      </View>

      <View className="bg-white border border-gray-200 rounded-lg p-4 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-800">
            Conditions
          </Text>
          <ActionButton
            testID="benefit-add-condition"
            label="Add condition"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onPress={addCondition}
          />
        </View>
        {form.conditions.length === 0 ? (
          <Text className="text-sm text-gray-500">No conditions.</Text>
        ) : (
          form.conditions.map((condition, index) => (
            <View
              key={`condition-${index}`}
              testID={`benefit-condition-${index}`}
              className="border border-gray-200 rounded-lg p-3 gap-2"
            >
              <SingleSelectDropdown
                title="Condition type"
                options={BENEFIT_CONDITION_TYPE_OPTIONS}
                selectedValue={condition.condition_type}
                disabled={disabled}
                onSelectionChange={v => {
                  const next = [...form.conditions];
                  next[index] = {
                    ...next[index],
                    condition_type: String(v) as ApiBenefitConditionType,
                  };
                  update('conditions', next);
                }}
              />
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Parameters (JSON)
                </Text>
                <AppTextInput
                  testID={`benefit-condition-params-${index}`}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  multiline
                  placeholder='{"flag":"being_student"}'
                  value={conditionParamDrafts[index] ?? ''}
                  editable={!disabled}
                  onChangeText={text => {
                    setConditionParamDrafts(prev => {
                      const next = [...prev];
                      next[index] = text;
                      return next;
                    });
                  }}
                />
              </View>
              <Pressable
                testID={`benefit-remove-condition-${index}`}
                disabled={disabled}
                onPress={() => removeCondition(index)}
              >
                <Text className="text-sm text-red-600">Remove</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View className="flex-row gap-3">
        <ActionButton
          testID="benefit-submit"
          label={submitLabel}
          variant="primary"
          disabled={disabled}
          onPress={() => {
            void handleSubmit();
          }}
        />
        {onCancel ? (
          <ActionButton
            testID="benefit-cancel"
            label="Cancel"
            variant="secondary"
            disabled={submitting}
            onPress={onCancel}
          />
        ) : null}
      </View>
    </View>
  );
}
