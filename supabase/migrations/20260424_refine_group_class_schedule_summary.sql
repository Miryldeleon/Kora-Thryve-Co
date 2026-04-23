create or replace function public.format_group_class_schedule_summary(target_template_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with grouped_rules as (
    select
      rule.weekday,
      rule.start_time_local,
      rule.end_time_local,
      array_agg(distinct rule.week_of_month order by rule.week_of_month) as weeks
    from public.group_class_recurrence_rules rule
    where rule.template_id = target_template_id
      and rule.is_active = true
    group by
      rule.weekday,
      rule.start_time_local,
      rule.end_time_local
  ),
  week_labels as (
    select
      grouped_rules.weekday,
      grouped_rules.start_time_local,
      grouped_rules.end_time_local,
      grouped_rules.weeks,
      array_agg(
        case week_value
          when 1 then '1st'
          when 2 then '2nd'
          when 3 then '3rd'
          when 4 then '4th'
          when 5 then '5th'
          else week_value::text
        end
        order by week_ordinality
      ) as labels
    from grouped_rules
    cross join unnest(grouped_rules.weeks) with ordinality as week_item(week_value, week_ordinality)
    group by
      grouped_rules.weekday,
      grouped_rules.start_time_local,
      grouped_rules.end_time_local,
      grouped_rules.weeks
  ),
  schedule_lines as (
    select
      week_labels.weekday,
      week_labels.start_time_local,
      concat(
        'Every ',
        case
          when cardinality(week_labels.weeks) = 5 and week_labels.weeks = array[1, 2, 3, 4, 5]::smallint[] then ''
          when cardinality(week_labels.labels) = 1 then week_labels.labels[1] || ' '
          when cardinality(week_labels.labels) = 2 then week_labels.labels[1] || ' & ' || week_labels.labels[2] || ' '
          else array_to_string(week_labels.labels[1:cardinality(week_labels.labels) - 1], ', ') || ' & ' || week_labels.labels[cardinality(week_labels.labels)] || ' '
        end,
        case week_labels.weekday
          when 0 then 'Sunday'
          when 1 then 'Monday'
          when 2 then 'Tuesday'
          when 3 then 'Wednesday'
          when 4 then 'Thursday'
          when 5 then 'Friday'
          when 6 then 'Saturday'
          else 'Unknown day'
        end,
        ' · ',
        to_char(week_labels.start_time_local, 'FMHH12:MI AM'),
        ' – ',
        to_char(week_labels.end_time_local, 'FMHH12:MI AM')
      ) as line
    from week_labels
  )
  select coalesce(
    string_agg(schedule_lines.line, ' | ' order by schedule_lines.weekday, schedule_lines.start_time_local),
    'No schedule yet'
  )
  from schedule_lines;
$$;

notify pgrst, 'reload schema';
