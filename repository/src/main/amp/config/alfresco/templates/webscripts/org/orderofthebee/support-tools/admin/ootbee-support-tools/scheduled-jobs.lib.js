/**
 * Copyright (C) 2016-2018 Axel Faust / Markus Joos / Jens Goldhammer
 * Copyright (C) 2016-2018 Order of the Bee
 *
 * This file is part of Community Support Tools
 *
 * Community Support Tools is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Community Support Tools is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Community Support Tools. If not, see <http://www.gnu.org/licenses/>.
 */
/*
 * Linked to Alfresco
 * Copyright (C) 2005-2018 Alfresco Software Limited.
 */

/* exported buildScheduledJobsData */
function buildScheduledJobsData()
{
    var ctxt, scheduler, jobsList, jobTriggers, scheduledJobsName, i, j, k, jobTriggerDetails, jobTriggerDetail, runningJobs, count, executingJobs, quartz, cronDefinition, parser, descriptor, cronExpressionDescription, cronExpression, triggerState, execContext, jobName;

    ctxt = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext();
    scheduler = ctxt.getBean('schedulerFactory', Packages.org.quartz.Scheduler);

    jobsList = scheduler.jobGroupNames;
    jobTriggers = [];
    scheduledJobsName = [];
    runningJobs = [];

    executingJobs = scheduler.getCurrentlyExecutingJobs();
    for (count = 0; count < executingJobs.size(); count++)
    {
        execContext = executingJobs.get(count);
        runningJobs.push(execContext.getJobDetail().getName() + "-" + execContext.getJobDetail().getGroup());
    }

    quartz = Packages.com.cronutils.model.CronType.QUARTZ;
    cronDefinition = Packages.com.cronutils.model.definition.CronDefinitionBuilder.instanceDefinitionFor(quartz);
    parser = new Packages.com.cronutils.parser.CronParser(cronDefinition);
    descriptor = Packages.com.cronutils.descriptor.CronDescriptor.instance(Packages.org.springframework.extensions.surf.util.I18NUtil
            .getLocale());

    for (i = 0; i < jobsList.length; i++)
    {
        jobName = scheduler.getJobNames(jobsList[i]);
        Packages.java.util.Arrays.sort(jobName);

        for (j = 0; j < jobName.length; j++)
        {
            jobTriggerDetails = scheduler.getTriggersOfJob(jobName[j], jobsList[i]);

            for (k = 0; k < jobTriggerDetails.length; k++)
            {
                jobTriggerDetail = jobTriggerDetails[k];
                triggerState = scheduler.getTriggerState(jobTriggerDetail.name, jobTriggerDetail.group);
                cronExpression = jobTriggerDetail.cronExpression;
                cronExpressionDescription = null;
                if (cronExpression)
                {
                    cronExpressionDescription = descriptor.describe(parser.parse(cronExpression));
                }
    
                jobTriggers.push({
                    triggerName : jobTriggerDetail.name,
                    triggerGroup : jobTriggerDetail.group,
                    triggerState : triggerState,
                    jobName : jobTriggerDetail.jobName,
                    jobGroup : jobTriggerDetail.jobGroup,
                    // trigger may not be cron-based
                    cronExpression : cronExpression || null,
                    cronExpressionDescription : cronExpressionDescription || null,
                    startTime : jobTriggerDetail.startTime,
                    previousFireTime : jobTriggerDetail.previousFireTime,
                    nextFireTime : jobTriggerDetail.nextFireTime,
                    timeZone : (jobTriggerDetail.timeZone !== undefined && jobTriggerDetail.timeZone !== null) ? jobTriggerDetail.timeZone.getID() : null,
                    running : (runningJobs.indexOf(jobTriggerDetail.jobName + "-" + jobTriggerDetail.jobGroup) !== -1)
                });
            }
        }
    }

    model.jobTriggers = jobTriggers;
    model.locale = Packages.org.springframework.extensions.surf.util.I18NUtil.getLocale().toString();
}

/**
 * uses the quartz scheduler to determine the current running jobs which are made available in the model via runningJobs
 * 
 */

/* exported buildRunningJobsData*/
function buildRunningJobsData()
{
    var ctxt, scheduler, runningJobsData, count, executingJobs, execContext;

    ctxt = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext();
    scheduler = ctxt.getBean('schedulerFactory', Packages.org.quartz.Scheduler);
    runningJobsData = [];

    executingJobs = scheduler.getCurrentlyExecutingJobs();
    for (count = 0; count < executingJobs.size(); count++)
    {
        execContext = executingJobs.get(count);
        runningJobsData.push({
            jobName : execContext.getJobDetail().getName(),
            groupName : execContext.getJobDetail().getGroup()
        });
    }

    model.runningJobs = runningJobsData;
}

/* exported executeJobNow */
function executeJobNow(jobName, jobGroup)
{
    var ctxt, scheduler;

    ctxt = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext();
    scheduler = ctxt.getBean('schedulerFactory', Packages.org.quartz.Scheduler);
    scheduler.triggerJob(jobName, jobGroup);
}

/* exported pauseTrigger */
function pauseTrigger(triggerName, triggerGroup)
{
    var ctxt, scheduler;

    ctxt = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext();
    scheduler = ctxt.getBean('schedulerFactory', Packages.org.quartz.Scheduler);
    scheduler.pauseTrigger(triggerName, triggerGroup);
}

/* exported resumeTrigger */
function resumeTrigger(triggerName, triggerGroup)
{
    var ctxt, scheduler;

    ctxt = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext();
    scheduler = ctxt.getBean('schedulerFactory', Packages.org.quartz.Scheduler);
    scheduler.resumeTrigger(triggerName, triggerGroup);
}